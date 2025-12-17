import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { processNote } from "@/lib/agent";

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const brainId = searchParams.get("brainId");

  const notes = await prisma.note.findMany({
    where: {
      userId: session.user.id,
      brainId: brainId || undefined // if null/empty, fetch without filtering (for now) or fetch global? Plan says specific brain. 
      // If brainId is not provided, we might want to return "no notes" or "notes without brain".
      // Let's assume for now filters by brainId if provided, else maybe all? 
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      summary: true,
      kind: true,
    },
  });
  return NextResponse.json(notes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.credits <= 0) {
    return new NextResponse("Insufficient credits", { status: 402 });
  }

  const { content, brainId } = await request.json();
  // Simple title extraction (first line)
  const title =
    content
      .split("\n")[0]
      .replace(/^#+\s*/, "")
      .substring(0, 50) || "Untitled";

  const note = await prisma.note.create({
    data: {
      content,
      title,
      kind: "entry",
      userId: session.user.id,
      brainId,
    },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { credits: { decrement: 1 } },
  });

  // Trigger Agent
  // We await it to ensure the graph is updated before returning,
  // though in a real app this should be backgrounded.
  if (content.trim()) {
    await processNote(note.id, session.user.id);
  }

  return NextResponse.json(note);
}
