"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Brain as BrainIcon, ArrowRight, Loader2, LogOut } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface Brain {
    id: string;
    name: string;
    _count: {
        notes: number;
    };
}

interface UserSession {
    name?: string | null;
    email?: string | null;
    image?: string | null;
}

export default function BrainDashboardClient({
    initialBrains,
    user
}: {
    initialBrains: Brain[],
    user: UserSession
}) {
    const router = useRouter();
    const [brains, setBrains] = useState<Brain[]>(initialBrains);
    const [isCreating, setIsCreating] = useState(false);
    const [newBrainName, setNewBrainName] = useState("");

    const handleCreateBrain = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBrainName.trim()) return;

        setIsCreating(true);
        try {
            const res = await fetch("/api/brains", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newBrainName }),
            });
            const newBrain = await res.json();
            router.push(`/brain/${newBrain.id}`);
        } catch (error) {
            console.error("Failed to create brain", error);
            setIsCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            {/* Header */}
            <header className="px-6 h-16 border-b border-white/5 bg-background/50 backdrop-blur-xl flex items-center justify-between sticky top-0 z-10">
                <Link href="/brain" className="flex items-center gap-2 font-serif font-bold text-xl tracking-tight">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <BrainIcon size={18} />
                    </div>
                    Thought Agent
                </Link>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium">{user?.name}</span>
                        <span className="text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-destructive transition-colors"
                        title="Sign Out"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-5xl w-full mx-auto p-8">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl font-bold font-serif mb-4">Your Brains</h1>
                    <p className="text-muted-foreground text-lg">Select a workspace to start thinking.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Create New Brain Card */}
                    <div className="p-6 rounded-3xl bg-card border border-white/5 flex flex-col gap-4 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                        <div className="flex items-center gap-3 text-primary mb-2">
                            <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                <Plus size={24} />
                            </div>
                            <h2 className="text-xl font-bold">New Brain</h2>
                        </div>
                        <p className="text-sm text-muted-foreground">Create a new isolated workspace for a specific project or topic.</p>

                        <form onSubmit={handleCreateBrain} className="mt-auto flex flex-col gap-3">
                            <input
                                type="text"
                                placeholder="Brain Name..."
                                className="w-full bg-secondary/50 border border-transparent focus:border-primary/30 rounded-xl px-4 py-2 text-sm focus:outline-none focus:bg-background transition-all"
                                value={newBrainName}
                                onChange={(e) => setNewBrainName(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={isCreating || !newBrainName.trim()}
                                className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                            >
                                {isCreating ? <Loader2 size={16} className="animate-spin" /> : "Create New Brain"}
                            </button>
                        </form>
                    </div>

                    {/* Existing Brains */}
                    {brains.map((brain) => (
                        <button
                            key={brain.id}
                            onClick={() => router.push(`/brain/${brain.id}`)}
                            className="text-left p-6 rounded-3xl bg-card/50 border border-white/5 hover:bg-card hover:border-primary/20 flex flex-col gap-4 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group"
                        >
                            <div className="flex justify-between items-start w-full mb-2">
                                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                                    <BrainIcon size={24} />
                                </div>
                                <div className="p-2 rounded-full bg-white/5 text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                                    <ArrowRight size={16} />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">{brain.name}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {brain._count.notes} {brain._count.notes === 1 ? 'note' : 'notes'} stored
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </main>
        </div>
    );
}
