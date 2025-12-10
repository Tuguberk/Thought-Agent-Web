"use client";

import { useState, useCallback } from "react";
import { NoteList } from "@/components/NoteList";
import { NoteEditor } from "@/components/NoteEditor";
import { GraphView } from "@/components/GraphView";
import { Network, PanelRightClose, PanelRightOpen, Layout } from "lucide-react";
import { cn } from "@/lib/utils";

import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";

export default function AppClient({ session }: { session: any }) {
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
      <div className="w-80 shrink-0 z-20 shadow-xl shadow-black/5 flex flex-col bg-background border-r border-white/5">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-card/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {session.user?.image ? (
              <img src={session.user.image} alt={session.user.name} className="w-8 h-8 rounded-full border border-white/10" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-white/10">
                <User size={16} />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">{session.user?.name || "User"}</span>
              <span className="text-xs text-muted-foreground">{session.user?.email || ""}</span>
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
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-w-0 relative">
        {/* Editor Pane 
            Hidden when no note is selected.
            Visible (flex-1) when note is selected.
        */}
        <div className={cn(
          "h-full transition-all duration-500 ease-in-out bg-background flex flex-col",
          !selectedNoteId
            ? "w-0 opacity-0 overflow-hidden"
            : "flex-1 opacity-100"
        )}>
          {/* Only render Editor if selectedNoteId exists to prevent unnecessary mounting/fetching in hidden state 
               However, keeping it mounted might be better for state preservation if needed, 
               but for 'closing' effect, unmounting or hiding is fine. 
               We use CSS hiding for transition effects.
           */}
          {selectedNoteId && (
            <NoteEditor
              noteId={selectedNoteId}
              onNoteUpdate={handleNoteUpdate}
              onNavigate={handleNavigate}
              onClose={() => setSelectedNoteId(null)}
              initialMode={editorMode}
            />
          )}
        </div>

        {/* Graph Pane 
            Full width when no note is selected.
            Sidebar width when note is selected.
        */}
        <div
          className={cn(
            "bg-gray-900/50 backdrop-blur-xl transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) relative flex flex-col",
            !selectedNoteId
              ? "flex-1 w-full border-l-0" // Full Screen Mode
              : isGraphVisible
                ? "w-[450px] shrink-0 border-l border-white/5 translate-x-0 opacity-100" // Sidebar Mode Visible
                : "w-0 border-l-0 translate-x-20 opacity-0 overflow-hidden" // Sidebar Mode Hidden
          )}
        >
          {/* Graph Toggle (Only visible when we are in Note Mode) */}
          {selectedNoteId && (
            <button
              onClick={() => setIsGraphVisible(!isGraphVisible)}
              className={cn(
                "absolute top-4 -left-12 z-50 p-2 rounded-l-xl bg-card border-y border-l border-white/10 text-muted-foreground hover:text-primary transition-all shadow-lg",
              )}
              title={isGraphVisible ? "Hide Graph" : "Show Graph"}
            >
              {isGraphVisible ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
            </button>
          )}

          <div className="flex-1 relative overflow-hidden">
            <GraphView onNodeClick={handleNavigate} selectedNodeId={selectedNoteId} />
          </div>

          {/* Overlay Text for Empty State (Only in Full Screen Graph Mode) */}
          {!selectedNoteId && (
            <div className="pointer-events-none absolute bottom-12 left-12 max-w-md animate-fadeIn z-10">
              <h1 className="text-4xl font-bold text-white/90 mb-4 font-serif tracking-tight">Thought Agent</h1>
              <p className="text-lg text-white/60 leading-relaxed">
                Select a node to explore your thoughts, or create a new note from the sidebar.
              </p>
            </div>
          )}
        </div>

        {/* Floating Toggle if Graph is Hidden and Editor is full width (Only when note is active) */}
        {selectedNoteId && !isGraphVisible && (
          <button
            onClick={() => setIsGraphVisible(true)}
            className="absolute top-4 right-4 z-30 p-2 rounded-lg bg-secondary/80 backdrop-blur border border-white/10 text-muted-foreground hover:text-primary transition-all shadow-lg hover:shadow-primary/10"
            title="Show Graph"
          >
            <Network size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
