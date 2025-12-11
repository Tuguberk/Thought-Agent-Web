import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/brains - List all brains for the current user
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const brains = await prisma.brain.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { notes: true },
            },
        },
    });

    return NextResponse.json(brains);
}

// POST /api/brains - Create a new brain
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name } = await request.json();

        if (!name || typeof name !== "string") {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const brain = await prisma.brain.create({
            data: {
                name: name.trim(),
                userId: session.user.id,
            },
        });

        return NextResponse.json(brain);
    } catch (error) {
        console.error("Failed to create brain:", error);
        return NextResponse.json(
            { error: "Failed to create brain" },
            { status: 500 }
        );
    }
}
