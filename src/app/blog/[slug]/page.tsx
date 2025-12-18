import Link from "next/link";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { Calendar, ArrowLeft, Share2 } from "lucide-react";
import { Metadata } from "next";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = await prisma.blogPost.findUnique({
        where: { slug: slug },
    });

    if (!post) {
        return { title: 'Post Not Found' };
    }

    return {
        title: `${post.title} | Thought Agent Blog`,
        description: post.summary,
        openGraph: {
            title: post.title,
            description: post.summary || "",
            type: 'article',
            publishedTime: post.createdAt.toISOString(),
        }
    };
}

export async function generateStaticParams() {
    const posts = await prisma.blogPost.findMany({ select: { slug: true } });
    return posts.map((post) => ({ slug: post.slug }));
}

export const revalidate = 3600;

export default async function BlogPostPage({ params }: PageProps) {
    const { slug } = await params;
    const post = await prisma.blogPost.findUnique({
        where: { slug },
    });

    if (!post) notFound();

    return (
        <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
            <article className="max-w-3xl mx-auto px-6 py-20">

                <Link href="/blog" className="inline-flex items-center text-sm text-white/40 hover:text-white transition-colors mb-12 group">
                    <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Blog
                </Link>

                {/* Header */}
                <header className="mb-16">
                    <div className="flex items-center gap-4 text-sm text-purple-400 font-medium mb-6 uppercase tracking-widest">
                        <span className="bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">Article</span>
                        <span className="flex items-center gap-1 text-white/40">
                            <Calendar size={14} />
                            {new Date(post.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-8 leading-tight">
                        {post.title}
                    </h1>

                    {post.summary && (
                        <p className="text-xl text-white/60 leading-relaxed font-light border-l-2 border-purple-500/50 pl-6">
                            {post.summary}
                        </p>
                    )}
                </header>

                {/* Markdown Content */}
                <div className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-purple-400 prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeHighlight]}
                    >
                        {post.content}
                    </ReactMarkdown>
                </div>

                {/* Footer */}
                <div className="mt-20 pt-10 border-t border-white/10 flex justify-between items-center">
                    <div className="text-sm text-white/40">
                        Published in <Link href="/blog" className="text-white hover:underline">The Thought Log</Link>
                    </div>
                    {/* <button className="flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors">
                <Share2 size={16} /> Share
             </button> */}
                </div>

            </article>

            {/* Scroll Progress  (Optional nice-to-have) */}
            <div className="fixed top-0 left-0 h-1 bg-gradient-to-r from-purple-500/0 via-purple-500 to-blue-500 z-50 w-full opacity-50 pointer-events-none mix-blend-screen" />
        </div>
    );
}
