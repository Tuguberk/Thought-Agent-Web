import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const parseBooleanParam = (value: string | null, fallback: boolean) => {
  if (value === null) return fallback;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const hideLonelyKeywords = parseBooleanParam(
    request.nextUrl.searchParams.get("hideLonelyKeywords"),
    true
  );

  const brainId = request.nextUrl.searchParams.get("brainId");

  const notes = await prisma.note.findMany({
    where: {
      userId: session.user.id,
      brainId: brainId || undefined
    },
    select: { id: true, title: true, kind: true },
  });

  const links = await prisma.link.findMany({
    where: {
      source: {
        userId: session.user.id,
        brainId: brainId || undefined
      },
      target: {
        userId: session.user.id,
        brainId: brainId || undefined
      }
    },
    select: { sourceId: true, targetId: true },
  });

  let responseNodes = notes;
  let responseLinks = links;

  if (hideLonelyKeywords) {
    const incomingCounts: Record<string, number> = {};
    for (const link of links) {
      incomingCounts[link.targetId] = (incomingCounts[link.targetId] || 0) + 1;
    }

    const filteredNodes = notes.filter((n) => {
      if (n.kind === "keyword") {
        return (incomingCounts[n.id] || 0) > 1;
      }
      return true;
    });

    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

    const filteredLinks = links.filter(
      (l) => filteredNodeIds.has(l.sourceId) && filteredNodeIds.has(l.targetId)
    );

    responseNodes = filteredNodes;
    responseLinks = filteredLinks;
  }

  return NextResponse.json({
    nodes: responseNodes.map((n) => ({
      id: n.id,
      name: n.title,
      kind: n.kind,
    })),
    links: responseLinks.map((l) => ({
      source: l.sourceId,
      target: l.targetId,
    })),
  });
}
