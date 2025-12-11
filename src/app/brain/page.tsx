
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AppClient from "./AppPageClient";

export default async function AppPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/");
    }

    return <AppClient session={session} />;
}
