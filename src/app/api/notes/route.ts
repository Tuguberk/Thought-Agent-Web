import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { processNote } from "@/lib/agent";

export async function GET() {
  const notes = await prisma.note.findMany({
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
  const { content } = await request.json();
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
    },
  });

  // Trigger Agent
  // We await it to ensure the graph is updated before returning,
  // though in a real app this should be backgrounded.
  if (content.trim()) {
    await processNote(note.id);
  }

  return NextResponse.json(note);
}
