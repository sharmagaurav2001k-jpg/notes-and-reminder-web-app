"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutGrid,
  List as ListIcon,
  Search,
  Pin,
  Star,
  Archive,
  ArchiveRestore,
  Trash2,
  Edit3,
  Tag as TagIcon,
  Clock,
  Plus,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";
import { NoteItem } from "@/components/notes/note-modal";

interface NotesListProps {
  notes: NoteItem[];
  isLoading: boolean;
  onOpenNote: (note: NoteItem) => void;
  onCreateNote: () => void;
  onRefresh: () => void;
}

export function NotesList({
  notes,
  isLoading,
  onOpenNote,
  onCreateNote,
  onRefresh,
}: NotesListProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchingServer, setIsSearchingServer] = useState(false);
  const [searchResults, setSearchResults] = useState<NoteItem[] | null>(null);

  const [activeTab, setActiveTab] = useState<"all" | "recent" | "favorites" | "archived">("all");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTag, setSelectedTag] = useState("All");

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Server-side Postgres Full-Text Search via /api/notes/search?q=
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults(null);
      setIsSearchingServer(false);
      return;
    }

    let isMounted = true;
    const fetchFts = async () => {
      try {
        setIsSearchingServer(true);
        const res = await fetch(`/api/notes/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setSearchResults(data.notes || []);
        }
      } catch (err) {
        console.error("FTS search error:", err);
      } finally {
        if (isMounted) setIsSearchingServer(false);
      }
    };

    fetchFts();

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  // Source list: If search active, use server searchResults; otherwise use local notes
  const sourceNotes = searchResults !== null ? searchResults : notes;

  // Collect unique categories & tags
  const categories = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      if (n.category) set.add(n.category);
    });
    return ["All", ...Array.from(set)];
  }, [notes]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      n.tags?.forEach((t) => set.add(t));
    });
    return ["All", ...Array.from(set)];
  }, [notes]);

  // Compute final filtered & sorted notes
  const displayNotes = useMemo(() => {
    let result = [...sourceNotes];

    // 1. Tab Filter
    if (activeTab === "recent") {
      result = result
        .filter((n) => !n.isArchived)
        .sort((a, b) => new Date(b.updatedAt || "").getTime() - new Date(a.updatedAt || "").getTime());
    } else if (activeTab === "favorites") {
      result = result.filter((n) => (n.isFavorite || n.isPinned) && !n.isArchived);
    } else if (activeTab === "archived") {
      result = result.filter((n) => n.isArchived);
    } else {
      // "all" tab: show active notes, pinned notes first
      result = result.filter((n) => !n.isArchived);
    }

    // 2. Category Filter
    if (selectedCategory !== "All") {
      result = result.filter((n) => n.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // 3. Tag Filter
    if (selectedTag !== "All") {
      result = result.filter((n) => n.tags?.includes(selectedTag));
    }

    return result;
  }, [sourceNotes, activeTab, selectedCategory, selectedTag]);

  // In-line Quick Action Handlers
  const handleTogglePin = async (e: React.MouseEvent, note: NoteItem) => {
    e.stopPropagation();
    if (!note.id || note.id.startsWith("temp-")) return;
    try {
      await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !note.isPinned }),
      });
      onRefresh();
    } catch (err) {
      console.error("Pin toggle error:", err);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, note: NoteItem) => {
    e.stopPropagation();
    if (!note.id || note.id.startsWith("temp-")) return;
    try {
      await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !note.isFavorite }),
      });
      onRefresh();
    } catch (err) {
      console.error("Favorite toggle error:", err);
    }
  };

  const handleToggleArchive = async (e: React.MouseEvent, note: NoteItem) => {
    e.stopPropagation();
    if (!note.id || note.id.startsWith("temp-")) return;
    try {
      await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !note.isArchived }),
      });
      onRefresh();
    } catch (err) {
      console.error("Archive toggle error:", err);
    }
  };

  const handleDeleteNote = async (e: React.MouseEvent, note: NoteItem) => {
    e.stopPropagation();
    if (!note.id || note.id.startsWith("temp-")) return;
    if (!window.confirm(`Delete note "${note.title}"?`)) return;
    try {
      await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
      onRefresh();
    } catch (err) {
      console.error("Delete note error:", err);
    }
  };

  // Color Mapping Helper
  const getColorClasses = (colorValue?: string) => {
    switch (colorValue) {
      case "indigo":
      case "blue":
        return "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400";
      case "emerald":
        return "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400";
      case "amber":
        return "bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 hover:border-amber-400";
      case "rose":
        return "bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 hover:border-rose-400";
      case "purple":
        return "bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 hover:border-purple-400";
      default:
        return "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-600";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Notes Workspace</span>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
              {displayNotes.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {debouncedQuery
              ? `Full-text search results for "${debouncedQuery}"`
              : "Search, organize, and filter by recent or favorites"}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Grid View"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="List View"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onCreateNote}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Dedicated Tabs + Debounced Search + Category/Tag Pills */}
      <div className="space-y-2.5 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Dedicated View Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "all", label: "All Notes" },
              { id: "recent", label: "⚡ Recent" },
              { id: "favorites", label: "⭐ Favorites / 📌 Pinned" },
              { id: "archived", label: "📦 Archived" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Debounced Full-Text Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes (Postgres FTS)..."
              className="w-full pl-8.5 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {isSearchingServer ? (
              <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 text-slate-400 hover:text-slate-600 absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Category & Tag Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white font-semibold shadow-2xs"
                  : "bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}

          {allTags.length > 1 && (
            <>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 shrink-0 mx-1" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                Tag:
              </span>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                    selectedTag === tag
                      ? "bg-violet-600 text-white font-semibold shadow-2xs"
                      : "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100"
                  }`}
                >
                  {tag === "All" ? "All Tags" : `#${tag}`}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Notes Display */}
      {displayNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-center group">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
            <Sparkles className="w-6 h-6 fill-indigo-600/20" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
            {debouncedQuery
              ? `No notes matching "${debouncedQuery}"`
              : activeTab === "favorites"
              ? "No favorite or pinned notes yet"
              : activeTab === "recent"
              ? "No recent notes found"
              : activeTab === "archived"
              ? "No archived notes"
              : "No notes found"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
            {debouncedQuery
              ? "Try searching for a different keyword or topic."
              : "Create a new note or change the selected tab."}
          </p>
          <button
            onClick={onCreateNote}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create a Note</span>
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* ================= GRID VIEW ================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayNotes.map((note) => {
            const isOptimistic = String(note.id).startsWith("temp-");
            const colorClasses = getColorClasses(note.color);

            return (
              <div
                key={note.id}
                onClick={() => !isOptimistic && onOpenNote(note)}
                className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all group cursor-pointer shadow-xs hover:shadow-lg ${colorClasses} ${
                  isOptimistic ? "animate-pulse opacity-75" : ""
                }`}
              >
                <div>
                  {/* Category & In-line Action Buttons */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      {note.category || "General"}
                    </span>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {/* Pin Button */}
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(e, note)}
                        title={note.isPinned ? "Unpin" : "Pin"}
                        className={`p-1 rounded-lg transition-colors cursor-pointer ${
                          note.isPinned
                            ? "text-indigo-600 dark:text-indigo-400 bg-indigo-100/80 dark:bg-indigo-900/60"
                            : "text-slate-400 hover:text-slate-600 hover:bg-black/5 dark:hover:bg-white/10"
                        }`}
                      >
                        <Pin className={`w-3.5 h-3.5 ${note.isPinned ? "fill-indigo-600/30" : ""}`} />
                      </button>

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(e, note)}
                        title={note.isFavorite ? "Favorited" : "Favorite"}
                        className={`p-1 rounded-lg transition-colors cursor-pointer ${
                          note.isFavorite
                            ? "text-amber-500 bg-amber-100/80 dark:bg-amber-950/60"
                            : "text-slate-400 hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/10"
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${note.isFavorite ? "fill-amber-400" : ""}`} />
                      </button>

                      {/* Archive Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleArchive(e, note)}
                        title={note.isArchived ? "Unarchive" : "Archive"}
                        className={`p-1 rounded-lg transition-colors cursor-pointer ${
                          note.isArchived
                            ? "text-indigo-600 bg-indigo-100/80"
                            : "text-slate-400 hover:text-slate-600 hover:bg-black/5 dark:hover:bg-white/10"
                        }`}
                      >
                        {note.isArchived ? (
                          <ArchiveRestore className="w-3.5 h-3.5" />
                        ) : (
                          <Archive className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNote(e, note)}
                        title="Delete Note"
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Body */}
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1.5">
                    {note.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {note.content || "No additional text."}
                  </p>

                  {/* Tag Badges */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-2.5">
                      {note.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-indigo-100/60 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                        >
                          #{t}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          +{note.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-black/5 dark:border-white/10 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recently"}
                  </span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Edit Note →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= LIST VIEW ================= */
        <div className="space-y-2.5">
          {displayNotes.map((note) => {
            const isOptimistic = String(note.id).startsWith("temp-");
            const colorClasses = getColorClasses(note.color);

            return (
              <div
                key={note.id}
                onClick={() => !isOptimistic && onOpenNote(note)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all group cursor-pointer shadow-2xs hover:shadow-md gap-3 ${colorClasses}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      {note.category || "General"}
                    </span>
                    {note.isPinned && (
                      <span className="text-indigo-600 dark:text-indigo-400" title="Pinned">
                        <Pin className="w-3 h-3 fill-indigo-600/30" />
                      </span>
                    )}
                    {note.isFavorite && (
                      <span className="text-amber-500" title="Favorite">
                        <Star className="w-3 h-3 fill-amber-400" />
                      </span>
                    )}
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {note.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-2xl">
                    {note.content || "No content."}
                  </p>

                  {note.tags && note.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {note.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Actions Toolbar */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/10">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(e, note)}
                      title={note.isPinned ? "Unpin" : "Pin"}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        note.isPinned
                          ? "text-indigo-600 bg-indigo-100/80 dark:bg-indigo-900/60"
                          : "text-slate-400 hover:text-slate-600 hover:bg-black/5 dark:hover:bg-white/10"
                      }`}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(e, note)}
                      title={note.isFavorite ? "Favorited" : "Favorite"}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        note.isFavorite
                          ? "text-amber-500 bg-amber-100/80 dark:bg-amber-950/60"
                          : "text-slate-400 hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/10"
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleToggleArchive(e, note)}
                      title={note.isArchived ? "Unarchive" : "Archive"}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteNote(e, note)}
                      title="Delete Note"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenNote(note)}
                      title="Edit Note"
                      className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer ml-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
