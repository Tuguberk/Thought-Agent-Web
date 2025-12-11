import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const brainId = searchParams.get("brainId");

  if (!query) {
    return NextResponse.json([]);
  }

  const results = await prisma.note.findMany({
    where: {
      userId: session.user.id,
      brainId: brainId || undefined,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 25,
    select: { id: true, title: true, createdAt: true, kind: true },
  });

  return NextResponse.json(results);
}
