"use client";

import { useState, useCallback } from "react";
import { NoteList } from "@/components/NoteList";
import { NoteEditor } from "@/components/NoteEditor";
import { GraphView } from "@/components/GraphView";
import { Network, PanelRightClose, PanelRightOpen, Layout, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable";

export default function AppClient({ session, brainId }: { session: any, brainId: string }) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isGraphVisible, setIsGraphVisible] = useState(true);
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("preview");

  const handleNoteUpdate = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleNavigate = useCallback((id: string | null, mode: "edit" | "preview" = "preview") => {
    setSelectedNoteId(id);
    setEditorMode(mode);
  }, []);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Sidebar - Note List */}
      <div className="w-70 shrink-0 z-20 shadow-xl shadow-black/5 flex flex-col bg-background border-r border-white/5">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-card/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link href="/brain" className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors" title="Back to Brains">
              <LayoutGrid size={18} />
            </Link>
            {session.user?.image ? (
              <img src={session.user.image} alt={session.user.name} className="w-8 h-8 rounded-full border border-white/10" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-white/10">
                <User size={16} />
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium leading-none max-w-[120px] truncate">{session.user?.name || "User"}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{(session.user as any).credits ?? 0} Credits</span>
                <Link href="/credits" className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded hover:bg-primary/30 transition-colors font-medium">Buy</Link>
              </div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-destructive transition-colors"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <NoteList
            selectedId={selectedNoteId}
            refreshKey={refreshKey}
            onSelect={handleNavigate}
            brainId={brainId}
            onNoteUpdate={handleNoteUpdate}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-w-0 relative">
        {!selectedNoteId ? (
          // Full Screen Graph Mode (No Note Selected)
          <div className="flex-1 relative bg-gray-900/50 backdrop-blur-xl">
            <GraphView onNodeClick={handleNavigate} selectedNodeId={null} brainId={brainId} refreshKey={refreshKey} />
            <div className="pointer-events-none absolute bottom-12 left-12 max-w-md animate-fadeIn z-10">
              <h1 className="text-4xl font-bold text-white/90 mb-4 font-serif tracking-tight">Thought Agent</h1>
              <p className="text-lg text-white/60 leading-relaxed">
                Select a node to explore your thoughts, or create a new note from the sidebar.
              </p>
            </div>
          </div>
        ) : (
          // Split View Mode (Note Selected)
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Editor Panel */}
            <ResizablePanel id="editor-panel" defaultSize={60} minSize={40} order={1} className="bg-background flex flex-col relative z-10">
              <NoteEditor
                noteId={selectedNoteId}
                onNoteUpdate={handleNoteUpdate}
                onNavigate={handleNavigate}
                onClose={() => setSelectedNoteId(null)}
                initialMode={editorMode}
                brainId={brainId}
              />
            </ResizablePanel>

            {isGraphVisible && <ResizableHandle className="w-1 bg-white/5 hover:bg-primary/50 transition-colors" />}

            {/* Graph Panel (Sidebar Mode) */}
            {isGraphVisible && (
              <ResizablePanel id="graph-panel" defaultSize={40} minSize={28} order={2} className="bg-gray-900/50 backdrop-blur-xl relative border-l border-white/5">
                <div className="w-full h-full relative overflow-hidden">
                  <GraphView onNodeClick={handleNavigate} selectedNodeId={selectedNoteId} brainId={brainId} refreshKey={refreshKey} />
                </div>
              </ResizablePanel>
            )}
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}
