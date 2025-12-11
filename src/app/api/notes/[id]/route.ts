import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { processNote } from "@/lib/agent";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const note = await prisma.note.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      summary: true,
      kind: true,
      linksFrom: {
        select: {
          matchedPhrase: true,
          type: true,
          target: { select: { id: true, title: true } },
        },
      },
      linksTo: {
        select: {
          matchedPhrase: true,
          type: true,
          source: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!note)
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  return NextResponse.json(note);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content, title } = await request.json();

  const existing = await prisma.note.findUnique({
    where: { id },
    select: { content: true },
  });

  if (!existing)
    return NextResponse.json({ error: "Note not found" }, { status: 404 });

  // If title is provided, use it. Otherwise, try to extract from content.
  const finalTitle =
    title ||
    content
      .split("\n")[0]
      .replace(/^#+\s*/, "")
      .substring(0, 50) ||
    "Untitled";

  const note = await prisma.note.update({
    where: { id },
    data: { content, title: finalTitle },
  });

  const { auth } = await import("@/auth");
  const session = await auth();

  if (!session?.user?.id) {
    // If no user, we can't process the note with user ID. 
    // For now, let's just skip processing or throw error. 
    // Given this is a PUT on an existing note, the user should be authenticated.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await processNote(id, session.user.id, existing.content);

  return NextResponse.json(note);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.note.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
