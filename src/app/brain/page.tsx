import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import BrainDashboardClient from "./BrainDashboardClient";

export default async function BrainDashboardPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/");
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

    return <BrainDashboardClient initialBrains={brains} user={session.user} />;
}
