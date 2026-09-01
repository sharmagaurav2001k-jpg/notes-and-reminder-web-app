"use client";

import React, { useState } from "react";
import {
  FileText,
  Pin,
  Star,
  Plus,
  Clock,
  ChevronRight,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { NoteItem, NoteModal } from "@/components/notes/note-modal";

interface RecentNotesWidgetProps {
  notes?: NoteItem[];
  isLoading?: boolean;
  onOpenNote?: (note: NoteItem) => void;
  onCreateNote?: () => void;
  onRefresh?: () => void;
  maxDisplay?: number;
}

// Utility to clean markdown characters for a clean text preview snippet
function cleanSnippet(content: string | null | undefined, maxLength: number = 110): string {
  if (!content) return "No preview text available.";
  const clean = content
    .replace(/^#+\s+/gm, "") // remove headings
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // remove bold
    .replace(/(\*|_)(.*?)\1/g, "$2") // remove italic
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // remove code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // remove markdown links
    .replace(/[-*+]\s+\[[ xX]\]\s+/g, "") // remove task checkboxes
    .replace(/[-*+]\s+/g, "") // remove list bullets
    .replace(/\n+/g, " ") // normalize whitespace
    .trim();

  return clean.length > maxLength ? clean.slice(0, maxLength) + "..." : clean;
}

// Format relative date
function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function RecentNotesWidget({
  notes = [],
  isLoading = false,
  onOpenNote,
  onCreateNote,
  onRefresh,
  maxDisplay = 4,
}: RecentNotesWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  const displayNotes = notes.slice(0, maxDisplay);

  const handleNoteClick = (note: NoteItem) => {
    if (onOpenNote) {
      onOpenNote(note);
    } else {
      setSelectedNote(note);
      setIsModalOpen(true);
    }
  };

  const handleCreate = () => {
    if (onCreateNote) {
      onCreateNote();
    } else {
      setSelectedNote(null);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Recent Notes</span>
              {notes.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {notes.length}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Quick access to recent thoughts & docs
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>

      {/* Notes List */}
      {displayNotes.length === 0 ? (
        <div className="py-7 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              No notes in cloud yet 📝
            </h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Capture your ideas, meeting notes, code snippets, or to-do lists.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create Your First Note</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayNotes.map((note) => {
            const snippet = cleanSnippet(note.content);
            const timeAgo = formatRelativeTime(note.updatedAt);

            return (
              <div
                key={note.id || note.title}
                onClick={() => handleNoteClick(note)}
                className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all group cursor-pointer space-y-1.5"
              >
                {/* Title & Metadata Top Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {note.isPinned && (
                      <Pin className="w-3 h-3 text-indigo-500 shrink-0 fill-indigo-500/20" />
                    )}
                    {note.isFavorite && (
                      <Star className="w-3 h-3 text-amber-400 shrink-0 fill-amber-400" />
                    )}
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {note.title}
                    </h4>
                  </div>

                  <span className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {timeAgo}
                  </span>
                </div>

                {/* Content Snippet */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-normal">
                  {snippet}
                </p>

                {/* Bottom Row: Category & Tags */}
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <span className="px-2 py-0.5 rounded-md font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                    {note.category || "General"}
                  </span>

                  {note.tags && note.tags.length > 0 && (
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[120px]">
                      #{note.tags[0]} {note.tags.length > 1 ? `+${note.tags.length - 1}` : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note Modal */}
      <NoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        note={selectedNote}
        onSaved={() => onRefresh?.()}
        onDeleted={() => onRefresh?.()}
      />
    </div>
  );
}
