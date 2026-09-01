"use client";

import React, { useState, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";
import { NoteModal, NoteItem } from "@/components/notes/note-modal";
import { NotesList } from "@/components/notes/notes-list";

export default function FavoritesPage() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchFavorites = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/notes?favoritesOnly=true");
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error("Failed to load favorites:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
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
          <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
          <span>Starred & Favorite Notes</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Your pinned and starred notes for quick reference across all categories.
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
          onRefresh={fetchFavorites}
        />
      )}

      <NoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        note={selectedNote}
        onSaved={fetchFavorites}
        onDeleted={fetchFavorites}
      />
    </div>
  );
}
