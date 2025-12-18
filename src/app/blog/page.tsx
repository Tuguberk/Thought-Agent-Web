import Link from "next/link";
import prisma from "@/lib/prisma";
import { ArrowRight, Calendar, BookOpen } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Thought Agent Blog - Insights on Productivity & AI",
    description: "Explore articles on note-taking strategies, brainstorming techniques, and how AI can enhance your cognitive workflow.",
};

export const revalidate = 3600; // Revalidate every hour

export default async function BlogIndexPage() {
    const posts = await prisma.blogPost.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">

            {/* Header */}
            <header className="border-b border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 opacity-50" />
                <div className="max-w-5xl mx-auto px-6 py-20 relative z-10">
                    <Link href="/" className="inline-block mb-6 text-sm font-medium text-white/40 hover:text-white transition-colors">
                        ← Back to App
                    </Link>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent p-1">
                        The Thought Log
                    </h1>
                    <p className="text-xl text-white/60 max-w-2xl leading-relaxed">
                        Insights, strategies, and deep dives into the world of digital gardening,
                        artificial intelligence, and structured thinking.
                    </p>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-5xl mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map((post) => (
                        <Link
                            key={post.id}
                            href={`/blog/${post.slug}`}
                            className="group flex flex-col h-full bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:shadow-2xl transition-all duration-300"
                        >
                            <div className="p-8 flex-1 flex flex-col">
                                <div className="flex items-center gap-3 text-xs font-medium text-white/40 mb-4 uppercase tracking-widest">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    <span>•</span>
                                    <span>Article</span>
                                </div>

                                <h2 className="text-2xl font-bold mb-3 leading-tight group-hover:text-purple-300 transition-colors">
                                    {post.title}
                                </h2>

                                <p className="text-white/60 leading-relaxed text-sm mb-6 flex-1 line-clamp-3">
                                    {post.summary}
                                </p>

                                <div className="mt-auto flex items-center text-sm font-medium text-purple-400 group-hover:text-purple-300">
                                    Read Article <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {posts.length === 0 && (
                    <div className="text-center py-20 text-white/40">
                        <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-medium mb-2">No articles yet</h3>
                        <p>Check back soon for fresh content.</p>
                    </div>
                )}
            </main>

            <footer className="border-t border-white/10 py-12 text-center text-white/30 text-sm">
                <p>&copy; {new Date().getFullYear()} Thought Agent. All rights reserved.</p>
            </footer>
        </div>
    );
}
