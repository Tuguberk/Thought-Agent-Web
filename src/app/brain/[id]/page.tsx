import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AppClient from "../AppPageClient";

export default async function BrainPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
        redirect("/");
    }

    return <AppClient session={session} brainId={id} />;
}
