import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(request: Request) {
    try {
        const { sourceId, targetId } = await request.json();

        if (!sourceId || !targetId) {
            return NextResponse.json(
                { error: "Missing sourceId or targetId" },
                { status: 400 }
            );
        }

        // Delete the link using the composite unique key
        await prisma.link.delete({
            where: {
                sourceId_targetId: {
                    sourceId,
                    targetId,
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete link:", error);
        return NextResponse.json(
            { error: "Failed to delete link" },
            { status: 500 }
        );
    }
}
