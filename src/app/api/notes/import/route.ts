import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { processNoteLight, processNote } from "@/lib/agent";

export const maxDuration = 300; // Extend timeout for bulk processing

export async function POST(request: Request) {
    try {
        const { auth } = await import("@/auth");
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { notes, brainId } = await request.json();

        if (!Array.isArray(notes) || notes.length === 0) {
            return NextResponse.json({ error: "No notes provided" }, { status: 400 });
        }

        const userId = session.user.id;
        const totalCost = notes.length;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || user.credits < totalCost) {
            return NextResponse.json(
                { error: `Insufficient credits. You need ${totalCost} but have ${user?.credits ?? 0}.` },
                { status: 402 }
            );
        }

        let successCount = 0;
        let skipCount = 0;
        let failedCount = 0;

        const importedIds: string[] = [];

        // Process sequentially to be safe with DB connections and rate limits
        // Parallelizing with a limit (e.g., p-limit) could be an optimization later
        for (const noteData of notes) {
            const { title, content } = noteData;

            if (!title || !content) {
                failedCount++;
                continue;
            }

            // Check for existing note with same title for this user and brain
            const existing = await prisma.note.findFirst({
                where: {
                    title: title,
                    userId: userId,
                    brainId: brainId || null // Check collision within specific brain or global if null
                }
            });

            if (existing) {
                // Simple duplicate check by Title
                skipCount++;
                continue;
            }

            try {
                const created = await prisma.note.create({
                    data: {
                        title: String(title),
                        content: String(content),
                        kind: "entry",
                        userId: userId,
                        brainId: brainId || undefined
                    }
                });

                importedIds.push(created.id);

                if (notes.length < 5) {
                    await processNote(created.id, userId);
                } else {
                    // Trigger light processing (Embeddings + Links)
                    // We await this to ensure it's done before reporting success, 
                    // to prevent user traversing away before embeddings are ready.
                    await processNoteLight(created.id, userId, content, title, brainId);
                }

                successCount++;
            } catch (error) {
                console.error(`Failed to import note "${title}":`, error);
                failedCount++;
            }
        }

        if (successCount > 0) {
            await prisma.user.update({
                where: { id: userId },
                data: { credits: { decrement: successCount } }
            });
        }

        return NextResponse.json({
            success: true,
            importedIds,
            stats: { imported: successCount, skipped: skipCount, failed: failedCount }
        });

    } catch (error) {
        console.error("Import error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
