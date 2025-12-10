import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rebuildKeywordNoteContent } from "@/lib/agent";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const note = await prisma.note.findUnique({
      where: { id },
      select: { id: true, title: true, kind: true },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.kind !== "keyword") {
      return NextResponse.json(
        { error: "Not a keyword note" },
        { status: 400 }
      );
    }

    // Use a local tracker to log the cost of this specific operation if needed
    const tracker = { count: 0 };

    const updated = await rebuildKeywordNoteContent(
      note.title || "Untitled",
      note.id,
      tracker
    );

    console.info(
      `[LLM] Manual rebuild for ${note.id} used ${tracker.count} requests. Updated: ${updated}`
    );

    return NextResponse.json({
      success: true,
      requestCount: tracker.count,
      updated,
    });
  } catch (error) {
    console.error("Error rebuilding note:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
