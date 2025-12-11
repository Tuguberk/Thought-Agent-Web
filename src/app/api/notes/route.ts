import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { processNote } from "@/lib/agent";

export async function GET() {
  const session = await auth();
  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const notes = await prisma.note.findMany({
    where: { userId: session.user.id },
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
      userId: session.user.id,
    },
  });

  // Trigger Agent
  // We await it to ensure the graph is updated before returning,
  // though in a real app this should be backgrounded.
  if (content.trim()) {
    await processNote(note.id, session.user.id);
  }

  return NextResponse.json(note);
}
