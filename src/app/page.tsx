

import Link from "next/link";
import { ArrowRight, Brain, Share2, Sparkles, Zap } from "lucide-react";
import { auth, signIn } from "@/auth";

export default async function LandingPage() {
    const session = await auth();

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30 selection:text-primary-foreground overflow-x-hidden">

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-serif font-bold text-xl tracking-tight">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <Brain size={18} />
                        </div>
                        Thought Agent
                    </div>
                    <div className="flex items-center gap-6">
                        {!session ? (
                            <form action={async () => {
                                "use server"
                                await signIn("google", { redirectTo: "/app" })
                            }}>
                                <button type="submit" className="px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-medium transition-all hover:scale-105">
                                    Sign In
                                </button>
                            </form>
                        ) : null}

                        {session ? (
                            <Link
                                href="/app"
                                className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:bg-primary/90 transition-all hover:scale-105 flex items-center gap-2 group"
                            >
                                Launch App
                                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        ) : (
                            <form action={async () => {
                                "use server"
                                await signIn("google", { redirectTo: "/app" })
                            }}>
                                <button type="submit" className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:bg-primary/90 transition-all hover:scale-105 flex items-center gap-2 group">
                                    Get Started
                                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 flex flex-col items-center text-center overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                    <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
                </div>

                <div className="relative z-10 max-w-4xl mx-auto space-y-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-muted-foreground mb-4 animate-fadeIn">
                        <Sparkles size={12} className="text-yellow-400" />
                        <span>Now with AI-Powered Graph Analysis</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight font-serif bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 pb-2">
                        Your Second Brain, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-primary animate-gradient bg-[length:200%_auto]">Visualized.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Transform your scattered notes into a living knowledge graph.
                        Thought Agent uses AI to automatically connect ideas, revealing hidden insights in your thinking.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        {session ? (
                            <Link
                                href="/app"
                                className="h-12 px-8 rounded-xl bg-primary text-primary-foreground text-base font-semibold shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:bg-primary/90 transition-all hover:scale-105 flex items-center gap-2"
                            >
                                Go to Dashboard
                                <ArrowRight size={18} />
                            </Link>
                        ) : (
                            <form action={async () => {
                                "use server"
                                await signIn("google", { redirectTo: "/app" })
                            }}>
                                <button type="submit" className="h-12 px-8 rounded-xl bg-primary text-primary-foreground text-base font-semibold shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:bg-primary/90 transition-all hover:scale-105 flex items-center gap-2">
                                    Get Started for Free
                                    <ArrowRight size={18} />
                                </button>
                            </form>
                        )}
                        <Link
                            href="/demo"
                            className="h-12 px-8 rounded-xl bg-secondary/50 hover:bg-secondary border border-white/5 text-base font-medium backdrop-blur-sm transition-all text-muted-foreground hover:text-foreground flex items-center gap-2"
                        >
                            <Share2 size={18} />
                            View Demo Graph
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 px-6 bg-secondary/20 relative border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="group p-8 rounded-3xl bg-card/30 border border-white/5 hover:bg-card/50 hover:border-primary/20 transition-all duration-300 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform duration-300">
                                <Share2 size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 font-serif">Interactive Graph</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Navigate your thoughts topographically. See how concepts link together and discover clusters of knowledge you didn't know you had.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="group p-8 rounded-3xl bg-card/30 border border-white/5 hover:bg-card/50 hover:border-purple-500/20 transition-all duration-300 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition-transform duration-300">
                                <Zap size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 font-serif">AI Auto-Linking</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Stop manually tagging. Our AI analyzes your content in real-time and suggests relevant connections to your existing knowledge base.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="group p-8 rounded-3xl bg-card/30 border border-white/5 hover:bg-card/50 hover:border-blue-500/20 transition-all duration-300 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                                <Brain size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 font-serif">Contextual Rebuild</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Generate comprehensive summary nodes that aggregate information from related notes, giving you a high-level overview instantly.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-white/5 bg-background">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                        <Brain size={16} />
                        <span>© 2024 Thought Agent Inc.</span>
                    </div>
                    <div className="flex gap-8 text-sm text-muted-foreground">
                        <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
                        <a href="#" className="hover:text-foreground transition-colors">Terms</a>
                        <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
                        <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
                    </div>
                </div>
            </footer>

        </div>
    );
}
