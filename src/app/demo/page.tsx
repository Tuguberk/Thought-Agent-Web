"use client";

import { GraphView } from "@/components/GraphView";
import Link from "next/link";
import { ArrowLeft, Brain } from "lucide-react";

const DEMO_DATA = {
    nodes: [
        { id: "1", name: "Thought Agent", kind: "entry" },
        { id: "2", name: "Artificial Intelligence", kind: "keyword" },
        { id: "3", name: "Knowledge Graph", kind: "keyword" },
        { id: "4", name: "Note Taking", kind: "keyword" },
        { id: "5", name: "Productivity", kind: "entry" },
        { id: "6", name: "Next.js", kind: "keyword" },
        { id: "7", name: "React", kind: "keyword" },
        { id: "8", name: "TailwindCSS", kind: "keyword" },
        { id: "9", name: "Graph Theory", kind: "entry" },
        { id: "10", name: "Neural Networks", kind: "keyword" },
        { id: "11", name: "Second Brain", kind: "entry" },
        { id: "12", name: "Zettelkasten", kind: "keyword" },
        { id: "13", name: "Machine Learning", kind: "keyword" },
        { id: "14", name: "Data Visualization", kind: "entry" },
        { id: "15", name: "Cognitive Science", kind: "entry" },
    ],
    links: [
        { source: "1", target: "2" },
        { source: "1", target: "3" },
        { source: "1", target: "4" },
        { source: "1", target: "6" },
        { source: "2", target: "10" },
        { source: "2", target: "13" },
        { source: "3", target: "9" },
        { source: "3", target: "14" },
        { source: "4", target: "11" },
        { source: "4", target: "12" },
        { source: "5", target: "4" },
        { source: "5", target: "11" },
        { source: "6", target: "7" },
        { source: "6", target: "8" },
        { source: "7", target: "14" },
        { source: "9", target: "14" },
        { source: "10", target: "13" },
        { source: "11", target: "15" },
        { source: "13", target: "15" },
        { source: "14", target: "1" },
        // Extra connections for complexity
        { source: "2", target: "15" },
        { source: "9", target: "2" },
        { source: "11", target: "3" },
    ],
};

// Cast to any to bypass strict type check for demo data
const typedDemoData = DEMO_DATA as any;

export default function DemoPage() {
    return (
        <div className="h-screen w-full bg-background relative flex flex-col">
            {/* Simple Header */}
            <div className="absolute top-0 left-0 w-full z-20 p-6 flex justify-between items-start pointer-events-none">

                <Link
                    href="/"
                    className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur border border-white/10 text-sm font-medium hover:bg-secondary/80 transition-all group shadow-lg"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                </Link>

                <div className="pointer-events-auto bg-card/80 backdrop-blur p-4 rounded-xl border border-white/10 max-w-sm shadow-xl">
                    <div className="flex items-center gap-2 font-serif font-bold text-lg mb-2">
                        <Brain size={20} className="text-primary" />
                        <span>Live Demo</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        This graph is interactive! Click nodes, drag them, or zoom in.
                        In the full app, this graph is automatically generated from your notes.
                    </p>
                </div>
            </div>

            <div className="flex-1 relative">
                <GraphView
                    onNodeClick={(id) => console.log("Clicked node:", id)}
                    staticData={typedDemoData}
                />
            </div>
        </div>
    );
}
