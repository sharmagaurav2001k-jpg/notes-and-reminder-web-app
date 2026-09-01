"use client";

import React, { useState, useEffect } from "react";
import { Archive, Loader2 } from "lucide-react";
import { NoteModal, NoteItem } from "@/components/notes/note-modal";
import { NotesList } from "@/components/notes/notes-list";

export default function ArchivePage() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchArchived = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/notes?archived=true");
      if (res.ok) {
        const data = await res.json();
        setNotes((data.notes || []).filter((n: NoteItem) => n.isArchived));
      }
    } catch (err) {
      console.error("Failed to load archive:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArchived();
  }, []);

  const handleOpenNote = (note: NoteItem) => {
    setSelectedNote(note);
    setIsModalOpen(true);
  };

  const handleCreateNote = () => {
    setSelectedNote(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <Archive className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span>Archived Notes</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Notes you&apos;ve archived to declutter your active dashboard workspace. You can unarchive or restore them anytime.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <NotesList
          notes={notes}
          isLoading={isLoading}
          onOpenNote={handleOpenNote}
          onCreateNote={handleCreateNote}
          onRefresh={fetchArchived}
        />
      )}

      <NoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        note={selectedNote}
        onSaved={fetchArchived}
        onDeleted={fetchArchived}
      />
    </div>
  );
}
