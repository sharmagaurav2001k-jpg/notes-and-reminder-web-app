"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Pin,
  Star,
  Trash2,
  Save,
  Loader2,
  Tag as TagIcon,
  Plus,
  Check,
  Archive,
  Palette,
  Bold,
  Italic,
  List,
  CheckSquare,
  Heading,
  Code,
  ChevronDown,
  Briefcase,
} from "lucide-react";

export interface NoteItem {
  id?: string;
  title: string;
  content: string | null;
  category: string;
  color?: string;
  projectId?: string | null;
  project?: {
    id: string;
    name: string;
    status?: string | null;
  } | null;
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  tags?: string[];
  updatedAt?: string;
}

interface CategoryItem {
  id: string;
  name: string;
  color?: string;
}

interface TagItem {
  id: string;
  name: string;
  color?: string;
}

interface ProjectItem {
  id: string;
  name: string;
}

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: NoteItem | null;
  onSaved: () => void;
  onDeleted?: () => void;
}

const DEFAULT_CATEGORIES = ["General", "Work", "Tech", "Personal", "Ideas", "Study"];
const NOTE_COLORS = [
  { label: "Default", value: "default", bg: "bg-white dark:bg-slate-900" },
  { label: "Indigo", value: "indigo", bg: "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60" },
  { label: "Emerald", value: "emerald", bg: "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800" },
  { label: "Amber", value: "amber", bg: "bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800" },
  { label: "Sky", value: "sky", bg: "bg-sky-50/70 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800" },
  { label: "Purple", value: "purple", bg: "bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800" },
];

export function NoteModal({
  isOpen,
  onClose,
  note,
  onSaved,
  onDeleted,
}: NoteModalProps) {
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [color, setColor] = useState("default");
  const [projectId, setProjectId] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Metadata from DB
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [availableProjects, setAvailableProjects] = useState<ProjectItem[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);

  // Fetch Categories, Tags & Projects
  const fetchMetadata = async () => {
    try {
      const [catRes, tagRes, projRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/tags"),
        fetch("/api/projects"),
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        if (catData.categories && catData.categories.length > 0) {
          setCategories(catData.categories);
        } else {
          setCategories(
            DEFAULT_CATEGORIES.map((name, idx) => ({
              id: `default-${idx}`,
              name,
              color: "#6366f1",
            }))
          );
        }
      }

      if (tagRes.ok) {
        const tagData = await tagRes.json();
        setAvailableTags(tagData.tags || []);
      }

      if (projRes.ok) {
        const projData = await projRes.json();
        setAvailableProjects(projData.projects || []);
      }
    } catch (err) {
      console.error("Failed to load note metadata:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMetadata();
    }
  }, [isOpen]);

  // Synchronize Note data into state on open
  useEffect(() => {
    if (note) {
      setTitle(note.title || "");
      setContent(note.content || "");
      setCategory(note.category || "General");
      setColor(note.color || "default");
      setProjectId(note.projectId || "");
      setTags(note.tags || []);
      setIsPinned(note.isPinned || false);
      setIsFavorite(note.isFavorite || false);
      setIsArchived(note.isArchived || false);
    } else {
      setTitle("");
      setContent("");
      setCategory("General");
      setColor("default");
      setProjectId("");
      setTags([]);
      setIsPinned(false);
      setIsFavorite(false);
      setIsArchived(false);
    }
    setTagInput("");
    setError(null);
    setShowColorPicker(false);
    setShowCategoryDropdown(false);
    setIsAddingNewCat(false);
  }, [note, isOpen]);

  // Keyboard shortcut: Cmd/Ctrl + S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && isOpen) {
        e.preventDefault();
        handleSave(e as any);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, title, content, category, color, projectId, tags, isPinned, isFavorite, isArchived]);

  if (!isOpen) return null;

  const isEditing = Boolean(note?.id);

  // Tag Management: Add Tag
  const handleAddTag = (rawTag: string) => {
    const clean = rawTag.trim().toLowerCase().replace(/^#/, "");
    if (!clean) return;
    if (!tags.includes(clean)) {
      if (tags.length >= 15) {
        setError("Maximum 15 tags per note allowed.");
        return;
      }
      setTags((prev) => [...prev, clean]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      handleRemoveTag(tags[tags.length - 1]);
    }
  };

  // Category Management: Create on the fly
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      setIsCreatingCategory(true);
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setCategory(data.category.name);
        setNewCatName("");
        setIsAddingNewCat(false);
        setShowCategoryDropdown(false);
        fetchMetadata();
      }
    } catch (err) {
      console.error("Failed to create category:", err);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Content Formatting Helpers
  const insertFormatting = (prefix: string, suffix: string = "") => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previousText = textarea.value;
    const selectedText = previousText.substring(start, end);

    const replacement = `${prefix}${selectedText || "text"}${suffix}`;
    const newText =
      previousText.substring(0, start) +
      replacement +
      previousText.substring(end);

    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedText.length || 4)
      );
    }, 0);
  };

  // Submit Note (Create / Edit)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a title for your note.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const payload = {
        title: title.trim(),
        content: content.trim(),
        category,
        color,
        tags,
        isPinned,
        isFavorite,
        isArchived,
        projectId: projectId.trim() ? projectId : null,
      };

      const url = isEditing ? `/api/notes/${note?.id}` : "/api/notes";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save note");
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Note
  const handleDelete = async () => {
    if (!note?.id) return;
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete note");
      onDeleted?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete note");
    } finally {
      setIsDeleting(false);
    }
  };

  const activeColorObj = NOTE_COLORS.find((c) => c.value === color) || NOTE_COLORS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className={`relative w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] ${activeColorObj.bg} border-slate-200 dark:border-slate-800 transition-colors`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 dark:border-slate-800/70 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="font-bold text-base text-slate-900 dark:text-slate-100">
              {isEditing ? "Edit Note" : "Create New Note"}
            </span>
            {note?.updatedAt && (
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                • Edited {new Date(note.updatedAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Color Palette Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="Change Color Theme"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <Palette className="w-4 h-4" />
              </button>

              {showColorPicker && (
                <div className="absolute right-0 mt-2 p-2 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl flex items-center gap-1.5 z-20 animate-in fade-in">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setColor(c.value);
                        setShowColorPicker(false);
                      }}
                      title={c.label}
                      className={`w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700 transition-transform ${
                        color === c.value ? "scale-115 ring-2 ring-indigo-500" : "hover:scale-105"
                      }`}
                      style={{
                        backgroundColor:
                          c.value === "default"
                            ? "#64748b"
                            : c.value === "indigo"
                            ? "#6366f1"
                            : c.value === "emerald"
                            ? "#10b981"
                            : c.value === "amber"
                            ? "#f59e0b"
                            : c.value === "sky"
                            ? "#0ea5e9"
                            : "#a855f7",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Pin Toggle */}
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? "Unpin Note" : "Pin Note to Top"}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isPinned
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
              }`}
            >
              <Pin className={`w-4 h-4 ${isPinned ? "fill-indigo-600/30" : ""}`} />
            </button>

            {/* Favorite Toggle */}
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isFavorite
                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-500"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
              }`}
            >
              <Star className={`w-4 h-4 ${isFavorite ? "fill-amber-400" : ""}`} />
            </button>

            {/* Archive Toggle */}
            <button
              type="button"
              onClick={() => setIsArchived(!isArchived)}
              title={isArchived ? "Unarchive Note" : "Archive Note"}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isArchived
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
              }`}
            >
              <Archive className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="px-6 py-2.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium border-b border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto">
          {/* Title Input */}
          <div>
            <input
              type="text"
              required
              placeholder="Note Title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl sm:text-2xl font-bold bg-transparent border-none text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none tracking-tight"
              autoFocus
            />
          </div>

          {/* Project & Category Selectors Row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            {/* Category Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-indigo-400 transition-all cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>{category}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showCategoryDropdown && (
                <div className="absolute left-0 mt-1.5 w-52 p-2 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl z-20 space-y-1 animate-in fade-in">
                  <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Category
                  </p>
                  <div className="max-h-44 overflow-y-auto space-y-0.5">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategory(cat.name);
                          setShowCategoryDropdown(false);
                        }}
                        className={`flex items-center justify-between w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                          category.toLowerCase() === cat.name.toLowerCase()
                            ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>{cat.name}</span>
                        {category.toLowerCase() === cat.name.toLowerCase() && (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    {isAddingNewCat ? (
                      <div className="flex items-center gap-1.5 p-1">
                        <input
                          type="text"
                          placeholder="New category..."
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCreateCategory();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleCreateCategory}
                          disabled={isCreatingCategory}
                          className="px-2 py-1 bg-indigo-600 text-white rounded-md text-[10px] font-bold"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCat(true)}
                        className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Category</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Project Selector Dropdown */}
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="">📁 No Project (General Note)</option>
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    💼 {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Multi-Select Tag Input with Type-to-Create */}
            <div className="flex-1 flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/50 dark:bg-slate-850/50 min-h-[38px]">
              <TagIcon className="w-3.5 h-3.5 text-slate-400 ml-1.5 shrink-0" />
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/50"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-500 p-0.5 rounded-full cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}

              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length === 0 ? "Type tags & press Enter..." : "Add tag..."}
                className="flex-1 min-w-[120px] bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none px-1"
              />
            </div>
          </div>

          {/* Formatting Helper Toolbar */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-100/50 dark:bg-slate-800/40 text-slate-500">
            <button
              type="button"
              onClick={() => insertFormatting("**", "**")}
              title="Bold (**text**)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("*", "*")}
              title="Italic (*text*)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("### ")}
              title="Heading (### Title)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Heading className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("- ")}
              title="Bullet List (- Item)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("- [ ] ")}
              title="Task Checkbox (- [ ] Task)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("```\n", "\n```")}
              title="Code block (```)"
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Note Content Textarea */}
          <div className="flex-1 min-h-[240px]">
            <textarea
              ref={contentRef}
              placeholder="Start writing your thoughts, checklist items, meeting notes, markdown..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full min-h-[240px] bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all resize-none leading-relaxed font-sans"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete Note</span>
              </button>
            ) : (
              <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">Ctrl+S</kbd> to save
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/35 active:scale-95 disabled:opacity-60 transition-all cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isEditing ? "Save Changes" : "Create Note"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
