"use client";

import { useEffect, useState, useMemo } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import { Save, Loader2, ArrowRight, ArrowLeft, Hash, ExternalLink, Eye, PenLine, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmationModal } from "./ui/ConfirmationModal";
import { AlertModal } from "./ui/AlertModal";

interface Note {
  id: string;
  title: string;
  content: string;
  kind?: "entry" | "keyword";
  linksFrom: Array<{
    matchedPhrase?: string;
    type?: string;
    target: { id: string; title: string };
  }>;
  linksTo: Array<{
    matchedPhrase?: string;
    type?: string;
    source: { id: string; title: string };
  }>;
}

interface NoteDirectoryEntry {
  id: string;
  title: string;
}

export function NoteEditor({
  noteId,
  onNoteUpdate,
  onNavigate,
  onClose,
  initialMode = "preview",
  brainId,
}: {
  noteId: string;
  onNoteUpdate?: () => void;
  onNavigate?: (id: string) => void;
  onClose?: () => void;
  initialMode?: "edit" | "preview";
  brainId: string;
}) {
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [noteDirectory, setNoteDirectory] = useState<NoteDirectoryEntry[]>([]);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("preview");
  const [linkToDelete, setLinkToDelete] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, message: string }>({ isOpen: false, message: "" });

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/notes?brainId=${brainId}`)
      .then((res) => res.json())
      .then((data: NoteDirectoryEntry[]) => {
        if (isMounted) setNoteDirectory(data);
      })
      .catch((err) => console.error("Failed to load note directory", err));

    return () => {
      isMounted = false;
    };
  }, [brainId]);

  const globalTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of noteDirectory) {
      const normalized = entry.title?.trim().toLowerCase();
      if (normalized) {
        map.set(normalized, entry.id);
      }
    }
    return map;
  }, [noteDirectory]);

  useEffect(() => {
    if (!noteId) return;

    // Reset view mode based on initialMode when switching notes
    setViewMode(initialMode);

    fetch(`/api/notes/${noteId}`)
      .then((res) => res.json())
      .then((data) => {
        setNote(data);
        setContent(data.content);
        setTitle(data.title || "");
        setIsGenerating(false);

        if (data.kind === "keyword") {
          setIsGenerating(true);
          fetch(`/api/notes/${noteId}/rebuild`, { method: "POST" })
            .then((res) => res.json())
            .then((result) => {
              if (result.success && result.updated) {
                return fetch(`/api/notes/${noteId}`);
              }
            })
            .then((res) => res && res.json())
            .then((updatedData) => {
              if (updatedData) {
                setNote(updatedData);
                setContent(updatedData.content);
              }
            })
            .catch((err) => console.error("Keyword generation failed", err))
            .finally(() => setIsGenerating(false));
        }
      });
  }, [noteId, initialMode]);

  const handleSave = async () => {
    if (!noteId) return;
    setIsSaving(true);
    const resUpdate = await fetch(`/api/notes/${noteId}`, {
      method: "PUT",
      body: JSON.stringify({ content, title }),
    });

    if (resUpdate.status === 402) {
      setAlertConfig({ isOpen: true, message: "Insufficient credits to save changes. Please top up your credits." });
      setIsSaving(false);
      return;
    }

    const res = await fetch(`/api/notes/${noteId}`);
    const data = await res.json();
    setNote(data);
    setTitle(data.title || "");
    setIsSaving(false);
    if (onNoteUpdate) onNoteUpdate();
  };

  const processedContent = useMemo(() => {
    if (!note) return content;

    const phraseTargets = new Map<string, { id: string; title: string }>();
    const titleToIdMap = new Map<string, string>();
    const normalizeLinkText = (value: string) =>
      value
        .replace(/^\s*\[\[/, "")
        .replace(/\]\]\s*$/, "")
        .trim()
        .toLowerCase();
    const normalizeTitle = (value: string) => value.trim().toLowerCase();

    for (const link of note.linksFrom) {
      if (link.matchedPhrase && link.target?.id) {
        const normalizedPhrase = normalizeLinkText(link.matchedPhrase);
        if (normalizedPhrase) {
          phraseTargets.set(normalizedPhrase, {
            id: link.target.id,
            title: link.target.title || "Untitled",
          });
        }
      }
      if (link.target?.title && link.target?.id) {
        const normalizedTitle = normalizeTitle(link.target.title);
        if (normalizedTitle) {
          titleToIdMap.set(normalizedTitle, link.target.id);
        }
      }
    }

    const processedText = content.replace(
      /\[\[([^\[\]]+?)\]\]/g,
      (match, keyword) => {
        const trimmedKeyword = keyword.trim();
        const lowerKeyword = trimmedKeyword.toLowerCase();

        const phraseTarget = phraseTargets.get(lowerKeyword);
        if (phraseTarget) {
          return `[${trimmedKeyword}](internal:${phraseTarget.id})`;
        }

        const titleId = titleToIdMap.get(lowerKeyword);
        if (titleId) {
          return `[${trimmedKeyword}](internal:${titleId})`;
        }

        const directoryId = globalTitleMap.get(lowerKeyword);
        if (directoryId && directoryId !== noteId) {
          return `[${trimmedKeyword}](internal:${directoryId})`;
        }

        return `[[${trimmedKeyword}]]`;
      }
    );

    return { text: processedText, phraseTargets, titleToIdMap };
  }, [content, note, globalTitleMap, noteId]);

  if (!noteId)
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/50 h-full bg-background/50 backdrop-blur-sm">
        <div className="p-4 rounded-full bg-secondary/30 mb-4 text-primary/40">
          <ArrowLeft size={48} strokeWidth={1} />
        </div>
        <p className="text-sm font-medium">Select a note from the library to begin</p>
      </div>
    );

  if (!note) return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Loader2 className="animate-spin text-primary" />
    </div>
  );

  const {
    text: markdownText,
    phraseTargets,
    titleToIdMap,
  } = typeof processedContent === "string"
      ? {
        text: processedContent,
        phraseTargets: new Map<string, { id: string; title: string }>(),
        titleToIdMap: new Map<string, string>(),
      }
      : processedContent;

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative selection:bg-primary/20">
      {/* Toolbar */}
      <div className="shrink-0 h-14 md:h-16 border-b border-white/5 flex items-center justify-between px-3 md:px-6 bg-background/80 backdrop-blur-md sticky top-0 z-20 gap-2 md:gap-4 transition-all">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all"
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          {note.kind === "keyword" && (
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full flex gap-1 items-center">
                <Hash size={10} /> <span className="hidden sm:inline">Keyword</span>
              </span>
              {isGenerating && (
                <span className="text-[9px] text-muted-foreground animate-pulse mt-0.5">
                  Generating...
                </span>
              )}
            </div>
          )}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 bg-transparent text-lg md:text-xl font-bold text-foreground placeholder:text-muted-foreground/40 focus:outline-none font-serif tracking-tight min-w-0 truncate"
            placeholder="Untitled Note"
          />
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* View Toggle */}
          <div className="flex p-0.5 bg-secondary/50 rounded-lg border border-white/5">
            <button
              onClick={() => setViewMode("edit")}
              className={cn(
                "px-2 md:px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-200",
                viewMode === "edit"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
              title="Edit"
            >
              <PenLine size={12} />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={cn(
                "px-2 md:px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all duration-200",
                viewMode === "preview"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
              title="Preview"
            >
              <Eye size={12} />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              isSaving
                ? "bg-secondary text-muted-foreground cursor-wait"
                : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-95"
            )}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span className="hidden sm:inline">{isSaving ? "Saving" : "Save"}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="hidden md:block p-2 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all ml-1"
              title="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-hidden relative">
        {/* Write Panel */}
        <div className={cn(
          "absolute inset-0 flex flex-col transition-all duration-300",
          viewMode === "edit" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
        )}>
          <div className="absolute top-4 right-6 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest pointer-events-none">
            Markdown Editor
          </div>
          <textarea
            className="flex-1 w-full h-full p-8 max-w-3xl mx-auto resize-none bg-transparent focus:outline-none font-mono text-sm leading-relaxed text-muted-foreground/90 placeholder:text-muted-foreground/20 scrollbar-hide"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing..."
            spellCheck={false}
          />
        </div>

        {/* Preview Panel */}
        <div className={cn(
          "absolute inset-0 overflow-y-auto px-8 py-8 scrollbar-hide bg-card/10 transition-all duration-300",
          viewMode === "preview" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
        )}>
          <div className="max-w-3xl mx-auto">
            <div className="prose prose-invert prose-sm max-w-none prose-headings:font-serif prose-headings:font-light prose-h1:text-3xl prose-p:leading-7 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-pre:bg-secondary/50 prose-pre:border prose-pre:border-white/5">
              <ReactMarkdown
                urlTransform={(value) => {
                  if (typeof value === "string" && value.startsWith("internal:")) {
                    return value;
                  }
                  return defaultUrlTransform(value);
                }}
                components={{
                  a: ({ href, children, node, title }) => {
                    const rawHref =
                      typeof href === "string" && href.length > 0
                        ? href
                        : (node?.properties?.href as string | undefined);

                    // Internal Links
                    if (rawHref?.startsWith("internal:")) {
                      const idPart = rawHref.substring(9);
                      return (
                        <span
                          role="button"
                          tabIndex={0}
                          className="text-primary hover:text-primary/80 font-medium cursor-pointer transition-colors px-0.5 rounded hover:bg-primary/10 inline-flex items-center gap-0.5"
                          onClick={(e) => {
                            e.preventDefault();
                            if (onNavigate) onNavigate(idPart);
                          }}
                        >
                          {children}
                        </span>
                      );
                    }

                    // Auto-detect phrases
                    const childText = String(children);
                    const lowerText = childText.trim().toLowerCase();
                    const target = phraseTargets.get(lowerText) || titleToIdMap.get(lowerText) || (globalTitleMap.get(lowerText) && globalTitleMap.get(lowerText) !== noteId ? { id: globalTitleMap.get(lowerText)! } : null);

                    const targetId = typeof target === 'object' ? target?.id : target;

                    if (targetId) {
                      return (
                        <span
                          role="button"
                          tabIndex={0}
                          className="text-primary hover:text-primary/80 font-medium cursor-pointer transition-colors px-0.5 rounded hover:bg-primary/10 inline-flex items-center gap-0.5"
                          onClick={(e) => {
                            e.preventDefault();
                            if (onNavigate) onNavigate(targetId);
                          }}
                        >
                          {children}
                        </span>
                      );
                    }

                    return (
                      <a
                        href={rawHref || "#"}
                        title={title}
                        target={rawHref ? "_blank" : undefined}
                        rel={rawHref ? "noopener noreferrer" : undefined}
                        className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5"
                      >
                        {children}
                        <ExternalLink size={10} className="opacity-50" />
                      </a>
                    );
                  },
                }}
              >
                {markdownText}
              </ReactMarkdown>

              {/* Backlinks / Related Links Footer */}
              {(note.linksFrom.length > 0 || note.linksTo.length > 0) && (
                <div className="mt-12 pt-6 border-t border-white/10">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Connections</h3>
                  <div className="flex flex-wrap gap-2">
                    {note.linksFrom.map((link) => (
                      <div
                        key={link.target.id}
                        className="group flex items-center gap-0 bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-lg border border-white/5 transition-all"
                      >
                        <button
                          onClick={() => onNavigate?.(link.target.id)}
                          className="py-1.5 text-xs flex items-center"
                        >
                          <span className="opacity-50 px-2">
                            {link.type === "keyword"
                              ? <Hash size={12} />
                              : <ArrowRight size={12} />}
                          </span>
                          <span>{link.target.title}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!note) return;
                            setLinkToDelete({
                              sourceId: note.id,
                              targetId: link.target.id,
                            });
                          }}
                          className="px-2 py-1.5 text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove connection"
                        >
                          <X className="hover:text-red-500" size={12} />
                        </button>
                      </div>
                    ))}
                    {note.linksTo.map((link) => (
                      <div
                        key={link.source.id}
                        className="group flex items-center gap-0 bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-lg border border-white/5 transition-all"
                      >
                        <button
                          onClick={() => onNavigate?.(link.source.id)}
                          className="py-1.5 text-xs flex items-center"
                        >
                          <span className="opacity-50 px-2">
                            <ArrowLeft size={12} />
                          </span>
                          <span>{link.source.title}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!note) return;
                            setLinkToDelete({
                              sourceId: link.source.id,
                              targetId: note.id,
                            });
                          }}
                          className="px-2 py-1.5 text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove connection"
                        >
                          <X className="hover:text-red-500" size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={!!linkToDelete}
        onClose={() => setLinkToDelete(null)}
        onConfirm={async () => {
          if (!linkToDelete) return;
          try {
            await fetch("/api/links", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(linkToDelete),
            });
            // update local state
            setNote((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                linksFrom: prev.linksFrom.filter((l) => l.target.id !== linkToDelete.targetId || prev.id !== linkToDelete.sourceId),
                linksTo: prev.linksTo.filter((l) => l.source.id !== linkToDelete.sourceId || prev.id !== linkToDelete.targetId),
              };
            });
            if (onNoteUpdate) onNoteUpdate();
          } catch (error) {
            console.error("Failed to delete link", error);
          }
        }}
        title="Remove Connection"
        description="Are you sure you want to remove this link? This action cannot be undone."
      />
      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        title="Insufficient Credits"
        description={alertConfig.message}
        actionLabel="Top Up"
        actionLink="/credits"
      />
    </div>
  );
}
