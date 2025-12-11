import prisma from "@/lib/prisma";
import { openrouter } from "@/lib/ai";
import { embed, generateText } from "ai";

const KEYWORD_BLOCK_START = "<!--keywords:start-->";
const KEYWORD_BLOCK_END = "<!--keywords:end-->";
const KEYWORD_BLOCK_REGEX = new RegExp(
  `${KEYWORD_BLOCK_START}[\\s\\S]*?${KEYWORD_BLOCK_END}`,
  "gi"
);
const BRACKET_REGEX = /\[\[([^\[\]]+?)\]\]/g;
const BRACKET_LINK_PATTERN = /\[\[[^\]]+\]\]/;
const MAX_SHARED_KEYWORD_LINKS = 12;
type LlmTracker = { count: number };

type NoteCategory = "entry" | "keyword";
type MinimalNote = {
  id: string;
  title: string | null;
  kind?: NoteCategory | null;
};

const normalizeToken = (value: string) => value.trim().replace(/\s+/g, " ");

const sanitizeJsonBlock = (text: string) =>
  text.replace(/```json\n?|\n```/g, "").replace(/```/g, "");

const stripKeywordBlock = (content: string) =>
  content.replace(KEYWORD_BLOCK_REGEX, "").trimEnd();

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isBoundaryChar = (char?: string) => {
  if (!char) return true;
  return /[\s.,;:!?"'`\-–—()\[\]{}<>]/.test(char);
};

const wrapKeywordsInline = (content: string, keywords: string[]) => {
  if (!keywords.length) return content;
  let updated = content;
  const sorted = [...keywords].sort((a, b) => b.length - a.length);

  for (const keyword of sorted) {
    const escaped = escapeRegExp(keyword);
    const regex = new RegExp(escaped, "gi");

    updated = updated.replace(regex, (match, offset, str) => {
      const beforeTwo = str.slice(Math.max(0, offset - 2), offset);
      const afterTwo = str.slice(
        offset + match.length,
        offset + match.length + 2
      );
      if (beforeTwo === "[[" && afterTwo === "]]") {
        return match;
      }
      const beforeChar = str[offset - 1];
      if (!isBoundaryChar(beforeChar)) {
        return match;
      }
      return `[[${match}]]`;
    });
  }

  return updated;
};

const truncateText = (value: string, maxLen = 200) => {
  if (!value) return "";
  return value.length <= maxLen ? value : `${value.slice(0, maxLen).trim()}...`;
};

const cleanMatchedPhrase = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const containsBracketedSyntax = (value: string) =>
  BRACKET_LINK_PATTERN.test(value);

const extractBracketRefs = (content: string) => {
  const matches = content.matchAll(BRACKET_REGEX);
  const tokens = new Set<string>();
  for (const match of matches) {
    const inner = normalizeToken(match[1] || "");
    if (inner) tokens.add(inner);
  }
  return Array.from(tokens);
};

const ensureLinkedNote = async (
  title: string,
  preferredKind: NoteCategory,
  cache: Map<string, MinimalNote>,
  userId: string
): Promise<MinimalNote | null> => {
  const normalized = title.toLowerCase();
  if (cache.has(normalized)) {
    return cache.get(normalized)!;
  }

  const existing = (await prisma.note.findFirst({
    where: { title: { equals: title, mode: "insensitive" } },
  })) as MinimalNote | null;

  if (existing) {
    cache.set(normalized, existing);
    return existing;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    title,
    content:
      preferredKind === "keyword"
        ? `Auto-generated keyword placeholder for [[${title}]].`
        : "",
    kind: preferredKind,
    userId: userId,
  };

  const created = (await prisma.note.create({ data: payload })) as MinimalNote;
  cache.set(normalized, created);
  return created;
};

export const rebuildKeywordNoteContent = async (
  keyword: string,
  keywordNoteId: string,
  tracker?: LlmTracker
): Promise<boolean> => {
  const keywordNote = await prisma.note.findUnique({
    where: { id: keywordNoteId },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      content: true,
      linksTo: {
        where: { type: "keyword" },
        select: {
          source: {
            select: {
              id: true,
              title: true,
              summary: true,
              content: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  if (!keywordNote) return false;

  const sources = keywordNote.linksTo
    .map((l) => l.source)
    .filter((s) => s !== null);

  if (sources.length === 0) return false;

  const latestSourceUpdate = sources.reduce((max, source) => {
    return source.updatedAt > max ? source.updatedAt : max;
  }, new Date(0));

  const isPlaceholder = keywordNote.content.includes(
    "Auto-generated keyword placeholder"
  );

  if (!isPlaceholder && keywordNote.updatedAt > latestSourceUpdate) {
    return false;
  }

  const uniqueSources = new Map<string, { title: string; summary: string }>();
  for (const link of keywordNote.linksTo || []) {
    if (!link.source) continue;
    const sourceId = link.source.id;
    if (uniqueSources.has(sourceId)) continue;
    const summaryText =
      link.source.summary?.trim() ||
      truncateText(link.source.content ?? "", 240) ||
      "Bu anahtar kelimeyle ilgili ek bilgi yakında.";
    uniqueSources.set(sourceId, {
      title: link.source.title || "Untitled",
      summary: summaryText,
    });
  }

  if (!uniqueSources.size) return false;

  const contextLines = Array.from(uniqueSources.values())
    .slice(0, 8)
    .map((entry) => `- ${entry.title}: ${entry.summary}`)
    .join("\n");

  let overview = Array.from(uniqueSources.values())[0].summary;
  if (contextLines.trim().length > 0) {
    try {
      if (tracker) tracker.count += 1;
      const { text } = await generateText({
        model: openrouter("google/gemini-2.5-flash-lite"),
        system:
          "You curate knowledge base keyword notes. Respond with 1-2 sentences of plain text without markdown fences.",
        prompt: `Keyword: ${keyword}\nContext:\n${contextLines}`,
      });
      overview = text.trim().replace(/^"+|"+$/g, "");
    } catch (error) {
      console.warn("Keyword overview generation failed", error);
    }
  }

  const relatedNotes = Array.from(uniqueSources.values())
    .map((entry) => `- [[${entry.title}]]: ${entry.summary}`)
    .join("\n");

  const content = `# ${keyword}\n\n## Overview\n${overview}\n\n## Related Notes\n${relatedNotes}\n`;

  await prisma.note.update({
    where: { id: keywordNoteId },
    data: { content },
  });
  return true;
};

export async function processNote(noteId: string, userId: string, previousContent?: string) {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) return;

  const noteKind = ((note as MinimalNote).kind ?? "entry") as NoteCategory;
  if (noteKind === "keyword") return;

  let workingContent = stripKeywordBlock(note.content);
  const llmTracker: LlmTracker = { count: 0 };
  const contentChanged =
    typeof previousContent === "string"
      ? previousContent !== note.content
      : true;

  if (!contentChanged) {
    console.info(`[LLM] processNote ${noteId} skipped (0 requests)`);
    return;
  }

  try {
    llmTracker.count += 1;
    const { embedding } = await embed({
      model: openrouter.embedding("openai/text-embedding-3-small"),
      value: workingContent,
    });

    llmTracker.count += 1;
    const { text: analysisJson } = await generateText({
      model: openrouter("google/gemini-2.5-flash-lite"),
      prompt: `Analyze the note content below and respond with JSON.\nReturn: {\n  "summary": "1-2 sentence summary",\n  "title": "short descriptive title",\n  "entities": ["important proper nouns or concepts"],\n  "keywords": ["single or double-word topic handles"]\n}\nUse the same language as the note and prefer precise phrases.\n\nContent:\n${workingContent}`,
      system: "Output valid JSON only without markdown fences.",
    });

    const cleanAnalysis = sanitizeJsonBlock(analysisJson);
    const parsed = JSON.parse(cleanAnalysis);
    const summary = parsed.summary;
    const generatedTitle = parsed.title;
    const entities: string[] = Array.isArray(parsed.entities)
      ? parsed.entities
      : [];
    const keywords: string[] = Array.isArray(parsed.keywords)
      ? parsed.keywords
      : [];

    const normalizedKeywords = Array.from(
      new Set(
        keywords
          .map((kw) => normalizeToken(kw))
          .filter((kw) => kw.length > 1 && kw.length <= 60)
      )
    ).slice(0, 10);

    const contentWithKeywords = wrapKeywordsInline(
      workingContent,
      normalizedKeywords
    );

    if (contentWithKeywords !== note.content) {
      await prisma.note.update({
        where: { id: noteId },
        data: { content: contentWithKeywords },
      });
    }

    workingContent = contentWithKeywords;

    const embeddingString = `[${embedding.join(",")}]`;

    if (!note.title || note.title.trim() === "" || note.title === "Untitled") {
      await prisma.$executeRaw`
        UPDATE "Note"
        SET summary = ${summary},
            title = ${generatedTitle},
            embedding = ${embeddingString}::vector
        WHERE id = ${noteId}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "Note"
        SET summary = ${summary},
            embedding = ${embeddingString}::vector
        WHERE id = ${noteId}
      `;
    }

    const bracketRefs = extractBracketRefs(workingContent);
    const keywordTargets = new Map<
      string,
      { label: string; note: MinimalNote }
    >();
    const bracketLinkTargets = new Set<string>();

    await prisma.link.deleteMany({
      where: {
        sourceId: noteId,
        type: "keyword_shared",
      },
    });

    const existingKeywordLinksPromise = prisma.link.findMany({
      where: { sourceId: noteId, type: "keyword" },
      select: { targetId: true },
    });
    const existingBracketLinksPromise = prisma.link.findMany({
      where: { sourceId: noteId, type: "bracket" },
      select: { targetId: true },
    });

    if (bracketRefs.length) {
      const cache = new Map<string, MinimalNote>();
      for (const ref of bracketRefs) {
        const normalizedRef = ref.toLowerCase();
        const target = await ensureLinkedNote(ref, "keyword", cache, userId);
        if (!target || target.id === noteId) continue;

        const linkType = target.kind === "keyword" ? "keyword" : "bracket";
        const phrase = `[[${ref}]]`;

        if (linkType === "keyword") {
          if (!keywordTargets.has(normalizedRef)) {
            keywordTargets.set(normalizedRef, {
              label: target.title || ref,
              note: target,
            });
          }
        } else {
          bracketLinkTargets.add(target.id);
        }

        await prisma.link.upsert({
          where: {
            sourceId_targetId: { sourceId: noteId, targetId: target.id },
          },
          create: {
            sourceId: noteId,
            targetId: target.id,
            type: linkType,
            matchedPhrase: phrase,
          },
          update: { type: linkType, matchedPhrase: phrase },
        });
      }
    }

    const [existingKeywordLinks, existingBracketLinks] = await Promise.all([
      existingKeywordLinksPromise,
      existingBracketLinksPromise,
    ]);

    const desiredKeywordTargetIds = new Set(
      Array.from(keywordTargets.values()).map(
        ({ note: keywordNote }) => keywordNote.id
      )
    );
    const desiredBracketTargetIds = bracketLinkTargets;

    const keywordTargetsToRemove = existingKeywordLinks.filter(
      (link) => !desiredKeywordTargetIds.has(link.targetId)
    );
    if (keywordTargetsToRemove.length) {
      await prisma.link.deleteMany({
        where: {
          sourceId: noteId,
          targetId: { in: keywordTargetsToRemove.map((link) => link.targetId) },
          type: "keyword",
        },
      });
    }

    const bracketTargetsToRemove = existingBracketLinks.filter(
      (link) => !desiredBracketTargetIds.has(link.targetId)
    );
    if (bracketTargetsToRemove.length) {
      await prisma.link.deleteMany({
        where: {
          sourceId: noteId,
          targetId: { in: bracketTargetsToRemove.map((link) => link.targetId) },
          type: "bracket",
        },
      });
    }

    // Eager keyword rebuilding removed for optimization.
    // for (const { label, note: keywordNote } of keywordTargets.values()) {
    //   await rebuildKeywordNoteContent(label, keywordNote.id, llmTracker);
    // }

    if (keywordTargets.size) {
      const sharedKeywordMap = new Map<string, Set<string>>();

      for (const { label, note: keywordNote } of keywordTargets.values()) {
        const siblings = await prisma.link.findMany({
          where: {
            targetId: keywordNote.id,
            type: "keyword",
            sourceId: { not: noteId },
          },
          select: { sourceId: true },
        });

        for (const sibling of siblings) {
          if (sibling.sourceId === noteId) continue;
          if (!sharedKeywordMap.has(sibling.sourceId)) {
            sharedKeywordMap.set(sibling.sourceId, new Set());
          }
          sharedKeywordMap.get(sibling.sourceId)!.add(label);
        }
      }

      if (sharedKeywordMap.size) {
        const orderedEntries = Array.from(sharedKeywordMap.entries()).sort(
          (a, b) => b[1].size - a[1].size
        );
        const limitedEntries = orderedEntries.slice(
          0,
          MAX_SHARED_KEYWORD_LINKS
        );
        const siblingIds = limitedEntries.map(([targetId]) => targetId);

        const existingLinks = siblingIds.length
          ? await prisma.link.findMany({
            where: {
              sourceId: noteId,
              targetId: { in: siblingIds },
            },
            select: { targetId: true },
          })
          : [];
        const alreadyLinked = new Set(
          existingLinks.map((link) => link.targetId)
        );

        for (const [targetId, keywordsSet] of limitedEntries) {
          if (targetId === noteId || alreadyLinked.has(targetId)) continue;
          const keywordList = Array.from(keywordsSet).slice(0, 5);
          if (!keywordList.length) continue;
          const keywordsSummary = keywordList.join(", ");
          const matchedPhraseLabel =
            keywordList.length === 1 ? keywordList[0] : keywordsSummary;
          await prisma.link.create({
            data: {
              sourceId: noteId,
              targetId,
              type: "keyword_shared",
              matchedPhrase: matchedPhraseLabel,
            },
          });
        }
      }
    }

    const normalizedEntities = Array.from(
      new Set(
        entities
          .map((entity) => normalizeToken(entity))
          .filter((entity) => entity.length > 1)
      )
    ).slice(0, 15);

    const vectorCandidates = await prisma.$queryRaw<
      Array<{ id: string; content: string; title: string | null }>
    >`
      SELECT id, content, title
      FROM "Note"
      WHERE id != ${noteId}
      AND embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingString}::vector
      LIMIT 8
    `;

    const entityCandidates = normalizedEntities.length
      ? await prisma.note.findMany({
        where: {
          id: { not: noteId },
          OR: normalizedEntities.map((term) => ({
            title: { equals: term, mode: "insensitive" },
          })),
        },
        select: { id: true, title: true, content: true },
      })
      : [];

    let reverseCandidates: Array<{
      id: string;
      content: string;
      title: string | null;
    }> = [];
    if (note.title && note.title.trim().length > 3) {
      reverseCandidates = await prisma.note.findMany({
        where: {
          id: { not: noteId },
          OR: [
            { content: { contains: note.title, mode: "insensitive" } },
            {
              content: {
                contains: `[[${note.title}]]`,
                mode: "insensitive",
              },
            },
          ],
        },
        take: 8,
        select: { id: true, title: true, content: true },
      });
    }

    const allCandidates = [
      ...vectorCandidates,
      ...entityCandidates,
      ...reverseCandidates,
    ];
    const uniqueCandidates = Array.from(
      new Map(allCandidates.map((item) => [item.id, item])).values()
    );
    const allowedTargetIds = new Set(uniqueCandidates.map((item) => item.id));

    if (uniqueCandidates.length > 0) {
      const prompt = `You are building a densely connected knowledge graph.\nAlways prefer returning a link when in doubt.\nReturn JSON: { "links": [ { "targetId": "...", "type": "semantic" | "phrase_match", "reason": "...", "matchedPhrase": "..." } ] }\nProvide up to 8 links. matchedPhrase must quote the exact substring from the new note when available.\n\nNew Note:\nTitle: ${note.title || "Untitled"
        }\nContent: ${workingContent}\n\nCandidates:\n${uniqueCandidates
          .map(
            (n) =>
              `- ID: ${n.id}\n  Title: ${n.title || "Untitled"
              }\n  Content: ${n.content.substring(0, 200)}...`
          )
          .join("\n")}`;

      llmTracker.count += 1;
      const { text: jsonResponse } = await generateText({
        model: openrouter("google/gemini-2.5-flash-lite"),
        system:
          "You are a knowledge graph assistant. Respond with aggressive but relevant links in pure JSON.",
        prompt,
      });

      const cleanJson = sanitizeJsonBlock(jsonResponse);
      const result = JSON.parse(cleanJson);

      await prisma.link.deleteMany({
        where: {
          sourceId: noteId,
          type: null,
        },
      });

      const desiredLlmLinksByType = new Map<string, Set<string>>();

      for (const link of result.links ?? []) {
        if (!link?.targetId) continue;
        if (!allowedTargetIds.has(link.targetId)) {
          continue;
        }

        const explicitPhrase = cleanMatchedPhrase(link.matchedPhrase);
        if (explicitPhrase && containsBracketedSyntax(explicitPhrase)) {
          continue;
        }

        let finalMatchedPhrase = explicitPhrase;
        if (!finalMatchedPhrase) {
          const reasonPhrase = cleanMatchedPhrase(link.reason);
          if (reasonPhrase) {
            finalMatchedPhrase = truncateText(reasonPhrase, 160);
          }
        }

        if (!finalMatchedPhrase) {
          continue;
        }

        const resolvedType = link.type || "semantic";
        if (!desiredLlmLinksByType.has(resolvedType)) {
          desiredLlmLinksByType.set(resolvedType, new Set());
        }
        desiredLlmLinksByType.get(resolvedType)!.add(link.targetId);

        await prisma.link.upsert({
          where: {
            sourceId_targetId: { sourceId: noteId, targetId: link.targetId },
          },
          create: {
            sourceId: noteId,
            targetId: link.targetId,
            type: resolvedType,
            matchedPhrase: finalMatchedPhrase,
          },
          update: {
            type: resolvedType,
            matchedPhrase: finalMatchedPhrase,
          },
        });
      }

      const existingLlmLinks = await prisma.link.findMany({
        where: {
          sourceId: noteId,
          type: { in: ["semantic", "phrase_match"] },
        },
        select: { targetId: true, type: true },
      });

      if (existingLlmLinks.length) {
        const removalsByType = new Map<string, string[]>();
        for (const existingLink of existingLlmLinks) {
          const linkType = existingLink.type || "semantic";
          const desiredTargets = desiredLlmLinksByType.get(linkType);
          if (desiredTargets && desiredTargets.has(existingLink.targetId)) {
            continue;
          }
          if (!removalsByType.has(linkType)) {
            removalsByType.set(linkType, []);
          }
          removalsByType.get(linkType)!.push(existingLink.targetId);
        }

        for (const [linkType, targetIds] of removalsByType.entries()) {
          if (!targetIds.length) continue;
          await prisma.link.deleteMany({
            where: {
              sourceId: noteId,
              type: linkType,
              targetId: { in: targetIds },
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("Error processing note:", error);
  } finally {
    console.info(
      `[LLM] processNote ${noteId} completed with ${llmTracker.count} requests`
    );
  }
}
