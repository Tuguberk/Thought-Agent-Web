"use client";

import { useRef, useState, useEffect } from "react";
import { Loader2, Plus, Search, Trash2, FileText, Hash, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmationModal } from "./ui/ConfirmationModal";

interface Note {
  id: string;
  title: string;
  createdAt: string;
  kind?: "entry" | "keyword";
}

export function NoteList({
  onSelect,
  selectedId,
  refreshKey,
}: {
  onSelect: (id: string | null, mode?: "edit" | "preview") => void;
  selectedId: string | null;
  refreshKey?: number;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/notes")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) setNotes(data);
      });
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => setSearchResults(data))
        .catch((error) => {
          if ((error as Error).name !== "AbortError") {
            console.error("Search failed", error);
          }
        })
        .finally(() => setIsSearching(false));
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const createNote = async () => {
    const res = await fetch("/api/notes", {
      method: "POST",
      body: JSON.stringify({ content: "" }),
    });
    const newNote = await res.json();
    setNotes([newNote, ...notes]);
    onSelect(newNote.id, "edit");
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;

    await fetch(`/api/notes/${noteToDelete}`, {
      method: "DELETE",
    });

    setNotes(notes.filter((n) => n.id !== noteToDelete));
    setSearchResults((prev) => prev.filter((n) => n.id !== noteToDelete));
    if (selectedId === noteToDelete) {
      onSelect(null);
    }
    setNoteToDelete(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNoteToDelete(id);
  };

  const visibleNotes = query.trim() ? searchResults : notes;
  const entries = visibleNotes.filter((n) => n.kind !== "keyword");
  const keywords = visibleNotes.filter((n) => n.kind === "keyword");
  const showEmptyState = visibleNotes.length === 0;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    const notesToImport = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.endsWith(".md")) {
        const text = await file.text();
        // Simple title extraction: filename without extension
        const title = file.name.replace(/\.md$/, "");
        notesToImport.push({ title, content: text });
      }
    }

    if (notesToImport.length > 0) {
      try {
        const res = await fetch("/api/notes/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: notesToImport })
        });
        const data = await res.json();
        if (data.success) {
          // Trigger refresh
          // We might need to expose a refresh callback or just rely on parent
          // But refreshKey is prop. 
          // Actually NoteList is self-contained for fetching, but it depends on refreshKey from parent to refetch.
          // We should probably tell parent we updated, but NoteList doesn't have onUpdate prop for list changes?
          // Wait, createNote calls onSelect(newNote.id).
          // We should probably just refetch local notes manually or simple window reload for now?
          // Or better: Re-fetch notes here locally?
          // The useEffect depends on 'refreshKey'.
          // We can cheat and run the fetch logic again.
          const notesRes = await fetch("/api/notes");
          const notesData = await notesRes.json();
          setNotes(notesData);
        }
      } catch (error) {
        console.error("Import failed", error);
      }
    }

    setIsImporting(false);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const renderNoteItem = (note: Note) => (
    <div
      key={note.id}
      onClick={() => onSelect(note.id)}
      className={cn(
        "group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 border border-transparent",
        selectedId === note.id
          ? "bg-primary/10 border-primary/20 shadow-sm"
          : "hover:bg-accent/40 hover:border-white/5"
      )}
    >
      <div className="flex-1 min-w-0 pr-3">
        <div className={cn("font-medium truncate flex items-center gap-2", selectedId === note.id ? "text-primary-foreground" : "text-foreground")}>
          {note.kind === 'keyword' ? <Hash size={14} className="text-muted-foreground/70" /> : <FileText size={20} className="text-muted-foreground/70" />}
          <span className="truncate text-sm">{note.title || "Untitled Note"}</span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 ml-6">
          {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </div>
      </div>

      <button
        onClick={(e) => handleDeleteClick(e, note.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-all duration-200"
        title="Delete note"
      >
        <Trash2 size={14} />
      </button>

      {selectedId === note.id && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-card/30 backdrop-blur-xl border-r border-white/5">
      {/* Header Area */}
      <div className="p-5 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold tracking-tight text-foreground/90">Library</h2>
          <div className="flex gap-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              // @ts-expect-error - webkitdirectory is non-standard but supported
              webkitdirectory=""
              directory=""
            />
            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
              title="Import Markdown Files"
            >
              {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            </button>
            <button
              onClick={createNote}
              className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all"
              title="New Note"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="relative group">
          <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground group-focus-within:text-primary transition-colors">
            <Search size={15} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full bg-secondary/50 border border-transparent focus:border-primary/30 focus:bg-background rounded-xl py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
          {isSearching && (
            <div className="absolute inset-y-0 right-3 flex items-center">
              <Loader2 className="animate-spin text-primary" size={14} />
            </div>
          )}
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-6 scrollbar-hide">
        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground/50 h-32">
            <Search size={32} strokeWidth={1.5} className="mb-2 opacity-50" />
            <p className="text-xs">
              {query.trim() ? "No matches found" : "Your thoughts are empty"}
            </p>
          </div>
        ) : (
          <>
            {entries.length > 0 && (
              <div className="space-y-1">
                <div className="px-3 pb-2 text-[10px] font-bold text-primary-foreground  uppercase tracking-widest">
                  Notes
                </div>
                <div className="space-y-1">
                  {entries.map(renderNoteItem)}
                </div>
              </div>
            )}

            {keywords.length > 0 && (
              <div className="space-y-1">
                <div className="px-3 pb-2 text-[10px] font-bold text-primary-foreground uppercase tracking-widest mt-4">
                  Keywords
                </div>
                <div className="space-y-1">
                  {keywords.map(renderNoteItem)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <ConfirmationModal
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone and the note will be permanently removed from your library."
      />
    </div >
  );
}
