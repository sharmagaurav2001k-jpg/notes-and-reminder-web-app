/**
 * WhatsApp Inbound Message Command Parser & Confirmation Dispatcher
 * Formats and routes instant confirmation replies for every user action.
 */

import { createNote, searchNotes } from "@/lib/services/notes.service";
import { createTask, completeTask, getTodayTasks } from "@/lib/services/tasks.service";
import { createGoal, getActiveGoals } from "@/lib/services/goals.service";
import { prisma } from "@/lib/prisma";

export type WhatsAppCommand =
  | { type: "NOTE"; title: string; content: string }
  | { type: "REMINDER"; title: string; dueDate: Date | null; dueTime: string | null; priority: "Low" | "Medium" | "High" | "Urgent" }
  | { type: "GOAL"; name: string; targetDate: Date | null }
  | { type: "DONE"; query: string }
  | { type: "SEARCH_NOTES"; term: string }
  | { type: "TODAY_TASKS" }
  | { type: "LIST_GOALS" }
  | { type: "HELP" }
  | { type: "CONNECT"; code: string }
  | { type: "UNKNOWN"; rawText: string };

/**
 * Find user by short connect code (last 6 chars of user ID or full ID)
 */
export async function findUserByConnectCode(code: string) {
  const cleanCode = code.trim().toLowerCase();
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, whatsappNumber: true, whatsappVerified: true },
  });
  return (
    users.find((u) => {
      const userIdLower = u.id.toLowerCase();
      return (
        userIdLower === cleanCode ||
        userIdLower.endsWith(cleanCode) ||
        userIdLower.slice(-6) === cleanCode
      );
    }) || null
  );
}

/**
 * Format date & time into friendly string e.g. "tomorrow 9 AM", "today 5:30 PM", "Fri, 28 Aug 3 PM"
 */
export function formatFriendlySchedule(dueDate: Date, dueTime?: string | null): string {
  const now = new Date();
  const isToday =
    dueDate.getDate() === now.getDate() &&
    dueDate.getMonth() === now.getMonth() &&
    dueDate.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    dueDate.getDate() === tomorrow.getDate() &&
    dueDate.getMonth() === tomorrow.getMonth() &&
    dueDate.getFullYear() === tomorrow.getFullYear();

  let datePart = "";
  if (isToday) {
    datePart = "today";
  } else if (isTomorrow) {
    datePart = "tomorrow";
  } else {
    datePart = dueDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  }

  if (dueTime) {
    const parts = dueTime.split(":");
    const h = parseInt(parts[0], 10);
    const m = parts[1] ? parseInt(parts[1], 10) : 0;
    const meridian = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    const mStr = m > 0 ? `:${m.toString().padStart(2, "0")}` : "";
    return `${datePart} at ${h12}${mStr} ${meridian}`;
  }

  return datePart;
}

/**
 * Parse natural relative and absolute date/time strings
 */
export function parseDateTimeHelper(timeStr: string, baseDate = new Date()): { dueDate: Date | null; dueTime: string | null } {
  if (!timeStr) return { dueDate: null, dueTime: null };

  const clean = timeStr.trim().toLowerCase();
  let dueDate: Date | null = new Date(baseDate);
  let dueTime: string | null = null;

  // 1. Time extraction (e.g. 9am, 5pm, 5:30pm, 17:00, at 8 am)
  const timeRegex = /(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
  const timeMatch = clean.match(timeRegex);

  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridian = timeMatch[3]?.toLowerCase();

    if (meridian === "pm" && hours < 12) hours += 12;
    if (meridian === "am" && hours === 12) hours = 0;

    dueTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  // 2. Relative day extraction
  if (clean.includes("tomorrow")) {
    dueDate.setDate(dueDate.getDate() + 1);
  } else if (clean.includes("tonight") || clean.includes("this evening")) {
    if (!dueTime) dueTime = "20:00";
  } else if (clean.includes("in ") && (clean.includes("hour") || clean.includes("hr") || clean.includes("min"))) {
    const hoursMatch = clean.match(/in\s+(\d+)\s*(?:hours?|hrs?)/i);
    const minsMatch = clean.match(/in\s+(\d+)\s*(?:minutes?|mins?)/i);

    const addHours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const addMins = minsMatch ? parseInt(minsMatch[1], 10) : 0;

    dueDate = new Date(Date.now() + (addHours * 60 + addMins) * 60 * 1000);
    dueTime = `${dueDate.getHours().toString().padStart(2, "0")}:${dueDate.getMinutes().toString().padStart(2, "0")}`;
  } else if (clean.includes("next week")) {
    dueDate.setDate(dueDate.getDate() + 7);
  } else if (clean.includes("next month")) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  } else {
    // Try day of week (e.g. on friday, next monday)
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const matchedDayIdx = daysOfWeek.findIndex((d) => clean.includes(d));

    if (matchedDayIdx !== -1) {
      const currentDay = dueDate.getDay();
      let diff = matchedDayIdx - currentDay;
      if (diff <= 0) diff += 7; // next occurrence
      dueDate.setDate(dueDate.getDate() + diff);
    } else {
      // Try direct date parse (e.g. "by dec 31", "25th march")
      const datePart = clean.replace(/^(by|on|before)\s+/i, "");
      const parsed = Date.parse(datePart);
      if (!isNaN(parsed)) {
        dueDate = new Date(parsed);
      }
    }
  }

  return { dueDate, dueTime };
}

/**
 * Main regex/keyword command tokenizer & parser
 */
export function parseInboundWhatsAppMessage(rawText: string): WhatsAppCommand {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 0. CONNECT / LINK MAGIC CODE: "connect <CODE>", "link <CODE>", "connect_<CODE>"
  const connectMatch = text.match(/^(?:connect|link)(?:_|\s+)([a-zA-Z0-9_\-]+)$/i);
  if (connectMatch) {
    return {
      type: "CONNECT",
      code: connectMatch[1].trim().toUpperCase(),
    };
  }

  // 1. HELP / MENU
  if (/^(help|menu|\?|hi|hello|start)$/i.test(lower)) {
    return { type: "HELP" };
  }

  // 2. TODAY / TASKS
  if (/^(today|my tasks|tasks|pending|agenda)$/i.test(lower)) {
    return { type: "TODAY_TASKS" };
  }

  // 3. GOALS LIST
  if (/^(goals|my goals|active goals)$/i.test(lower)) {
    return { type: "LIST_GOALS" };
  }

  // 4. FIND MY NOTES: "find my notes about <term>", "search notes <term>", "notes about <term>"
  const searchMatch = text.match(/^(?:find\s+(?:my\s+)?notes\s+about|search\s+notes\s+(?:about\s+|for\s+)?|notes\s+about|find\s+notes\s+)(.+)$/i);
  if (searchMatch) {
    return {
      type: "SEARCH_NOTES",
      term: searchMatch[1].trim(),
    };
  }

  // 5. DONE / COMPLETE TASK: "done <task>", "complete <task>", "finished <task>"
  const doneMatch = text.match(/^(?:done|complete|completed|finish|finished)\s+(.+)$/i);
  if (doneMatch) {
    return {
      type: "DONE",
      query: doneMatch[1].trim(),
    };
  }

  // 6. GOAL: "goal <text> by <date>" or "new goal <text> by <date>" or "goal: <text>"
  const goalByMatch = text.match(/^(?:new\s+)?goal(?::|\s+)\s*(.+?)\s+by\s+(.+)$/i);
  if (goalByMatch) {
    const goalName = goalByMatch[1].trim();
    const dateStr = goalByMatch[2].trim();
    const { dueDate } = parseDateTimeHelper(dateStr);

    return {
      type: "GOAL",
      name: goalName,
      targetDate: dueDate,
    };
  }

  const goalDirectMatch = text.match(/^(?:new\s+)?goal(?::|\s+)\s*(.+)$/i);
  if (goalDirectMatch) {
    return {
      type: "GOAL",
      name: goalDirectMatch[1].trim(),
      targetDate: null,
    };
  }

  // 7. REMIND ME: "remind me <when> to <text>" OR "remind me to <text> <when>" OR "reminder: <text>"
  // Pattern A: "remind me <when> to <action>" (e.g. "remind me tomorrow at 9am to buy domain")
  const remindWhenToMatch = text.match(/^remind\s+me\s+(.+?)\s+to\s+(.+)$/i);
  if (remindWhenToMatch) {
    const whenStr = remindWhenToMatch[1].trim();
    const actionStr = remindWhenToMatch[2].trim();
    const { dueDate, dueTime } = parseDateTimeHelper(whenStr);
    const isUrgent = /urgent|important|asap/i.test(actionStr);

    return {
      type: "REMINDER",
      title: actionStr,
      dueDate,
      dueTime,
      priority: isUrgent ? "Urgent" : "Medium",
    };
  }

  // Pattern B: "remind me to <action> <when>" (e.g. "remind me to buy groceries tomorrow at 6pm")
  const remindToWhenMatch = text.match(/^remind\s+me\s+to\s+(.+?)(?:\s+(at|on|tomorrow|tonight|in\s+\d+|next\s+\w+)\s+(.+))?$/i);
  if (remindToWhenMatch) {
    const actionStr = remindToWhenMatch[1].trim();
    const whenIndicator = remindToWhenMatch[2];
    const restWhen = remindToWhenMatch[3];
    const whenStr = whenIndicator ? `${whenIndicator} ${restWhen || ""}`.trim() : "";

    const { dueDate, dueTime } = parseDateTimeHelper(whenStr || "today");
    const isUrgent = /urgent|important|asap/i.test(actionStr);

    return {
      type: "REMINDER",
      title: actionStr,
      dueDate,
      dueTime,
      priority: isUrgent ? "Urgent" : "Medium",
    };
  }

  // Pattern C: "task: <text>" or "todo: <text>"
  const directTaskMatch = text.match(/^(?:task|todo|reminder)(?::|\s+)\s*(.+)$/i);
  if (directTaskMatch) {
    const rawTask = directTaskMatch[1].trim();
    const { dueDate, dueTime } = parseDateTimeHelper(rawTask);
    const cleanTitle = rawTask.replace(/\b(today|tomorrow|tonight|at\s+\d+(?::\d+)?\s*(?:am|pm)?)\b/gi, "").trim();

    return {
      type: "REMINDER",
      title: cleanTitle || rawTask,
      dueDate,
      dueTime,
      priority: /urgent|important/i.test(rawTask) ? "Urgent" : "Medium",
    };
  }

  // 8. NOTE: "note <text>", "add note <text>", "save note <text>", "note: <text>"
  const noteMatch = text.match(/^(?:(?:add|save|create)\s+)?note(?::|\s+)\s*([\s\S]+)$/i);
  if (noteMatch) {
    const noteBody = noteMatch[1].trim();
    const lines = noteBody.split("\n");
    const title = lines[0].slice(0, 70);
    const content = lines.length > 1 ? lines.slice(1).join("\n").trim() : noteBody;

    return {
      type: "NOTE",
      title,
      content,
    };
  }

  return { type: "UNKNOWN", rawText: text };
}

/**
 * Execute parsed command via centralized DB services & format confirmation reply
 */
export async function executeWhatsAppCommand(
  command: WhatsAppCommand,
  userId: string,
  userName = "there"
): Promise<string> {
  switch (command.type) {
    // 0. MAGIC CONNECT COMMAND
    case "CONNECT": {
      return (
        `🎉 *WhatsApp Connected Successfully!*\n\n` +
        `Welcome to Smart Notes & Reminder, *${userName}*! 🚀\n` +
        `Your WhatsApp is now securely linked to your account with zero OTP.\n\n` +
        `Try texting:\n` +
        `• *today* — View scheduled tasks\n` +
        `• *note <text>* — Save a new note\n` +
        `• *remind me <when> to <action>* — Schedule task\n` +
        `• *help* — Full command guide`
      );
    }

    // 1. HELP / MENU
    case "HELP": {
      return (
        `👋 *Smart Notes & Reminder Commands*\n\n` +
        `Hi ${userName}! You can text me naturally anytime:\n\n` +
        `📝 *note <text>*\n_e.g. note Meeting with client about redesign_\n\n` +
        `⏰ *remind me <when> to <action>*\n_e.g. remind me tomorrow at 9 AM to buy domain_\n\n` +
        `🎯 *goal <text> by <date>*\n_e.g. goal launch product MVP by next month_\n\n` +
        `✅ *done <task name or #>*\n_e.g. done call doctor_\n\n` +
        `🔍 *find my notes about <term>*\n_e.g. find my notes about project architecture_\n\n` +
        `📋 *today* — View all tasks scheduled for today\n` +
        `🎯 *goals* — View your active goals & progress\n\n` +
        `_Instant 2-way sync with your web app dashboard! 🚀_`
      );
    }

    // 2. CREATE NOTE: Confirmation reply "✅ Note saved"
    case "NOTE": {
      const note = await createNote({
        userId,
        title: command.title,
        content: command.content,
        category: "WhatsApp Capture",
      });

      return (
        `✅ *Note saved!*\n\n` +
        `📌 *Title:* ${note.title}\n` +
        (note.content && note.content !== note.title ? `📝 *Content:* ${note.content.slice(0, 150)}...\n` : "") +
        `📁 *Category:* ${note.categoryName}\n\n` +
        `Synced directly to your web app notes library! ✨`
      );
    }

    // 3. CREATE REMINDER / TASK: Confirmation reply "✅ Reminder set for tomorrow 9 AM"
    case "REMINDER": {
      const dueDate = command.dueDate || new Date();
      const task = await createTask({
        userId,
        title: command.title,
        dueDate,
        dueTime: command.dueTime || null,
        priority: command.priority || "Medium",
        status: "Todo",
      });

      const friendlySchedule = formatFriendlySchedule(dueDate, task.dueTime);
      const priorityEmoji = task.priority === "Urgent" ? "🔴" : task.priority === "High" ? "🟠" : "🟡";

      return (
        `✅ *Reminder set for ${friendlySchedule}!*\n\n` +
        `📝 *Task:* ${task.title}\n` +
        `${priorityEmoji} *Priority:* ${task.priority}\n\n` +
        `I will remind you when it's due! 🚀`
      );
    }

    // 4. CREATE GOAL: Confirmation reply "🎯 Goal created: <name>"
    case "GOAL": {
      const targetDate = command.targetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const goal = await createGoal({
        userId,
        name: command.name,
        targetDate,
        priority: "Medium",
        status: "Active",
        type: "Short-term",
        category: "General",
      });

      const targetDateStr = goal.targetDate
        ? new Date(goal.targetDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
        : "No deadline";

      return (
        `🎯 *Goal created!*\n\n` +
        `🏆 *Goal:* ${goal.name}\n` +
        `📅 *Target Date:* ${targetDateStr}\n` +
        `📊 *Progress:* 0%\n\n` +
        `Track milestones & projects in your Goals dashboard! 💪`
      );
    }

    // 5. COMPLETE TASK: Confirmation reply "✅ Task completed: <name>"
    case "DONE": {
      const query = command.query.toLowerCase().trim();

      // Find candidate pending tasks
      const pendingTasks = await prisma.task.findMany({
        where: {
          userId,
          status: { not: "Completed" },
        },
        orderBy: { dueDate: "asc" },
        take: 20,
      });

      if (pendingTasks.length === 0) {
        return `🎉 You have no pending tasks right now! Great job.`;
      }

      // Check if user passed an index e.g. "done 1"
      const index = parseInt(query, 10);
      let targetTask = null;

      if (!isNaN(index) && index >= 1 && index <= pendingTasks.length) {
        targetTask = pendingTasks[index - 1];
      } else {
        targetTask = pendingTasks.find((t) => t.title.toLowerCase().includes(query));
      }

      if (!targetTask) {
        const top3 = pendingTasks.slice(0, 3).map((t, i) => `${i + 1}. ${t.title}`).join("\n");
        return (
          `🔍 Could not find a pending task matching "*${command.query}*".\n\n` +
          `*Here are your current tasks:*\n${top3}\n\n` +
          `_Tip: Reply with "done 1" or "done <task name>"_`
        );
      }

      const result = await completeTask({
        taskId: targetTask.id,
        userId,
        targetStatus: "Completed",
      });

      const recurringNote = result.nextOccurrence
        ? `\n🔁 *Next instance scheduled:* ${new Date(result.nextOccurrence.dueDate!).toLocaleDateString([], { month: "short", day: "numeric" })}`
        : "";

      return (
        `✅ *Task completed!*\n\n` +
        `~~${result.task.title}~~${recurringNote}\n\n` +
        `Marked complete in your dashboard! Keep the momentum going! 🔥`
      );
    }

    // 6. SEARCH NOTES: Confirmation reply with results
    case "SEARCH_NOTES": {
      const matchingNotes = await searchNotes({
        userId,
        query: command.term,
        limit: 4,
      });

      if (matchingNotes.length === 0) {
        return `🔍 No notes found matching "*${command.term}*".\n\n_Create one by typing: note ${command.term}: ..._`;
      }

      const results = matchingNotes
        .map((n, idx) => {
          const excerpt = n.content ? `\n   _${n.content.slice(0, 80)}..._` : "";
          const date = new Date(n.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" });
          return `${idx + 1}. 📄 *${n.title}* (${date})${excerpt}`;
        })
        .join("\n\n");

      return `📚 *Found ${matchingNotes.length} Note(s) for "${command.term}":*\n\n${results}`;
    }

    // 7. TODAY'S TASKS
    case "TODAY_TASKS": {
      const tasks = await getTodayTasks(userId);

      if (tasks.length === 0) {
        return `🎉 *No tasks scheduled for today!*\n\nAdd one by replying: _remind me today to <action>_`;
      }

      const formatted = tasks
        .map((t, idx) => {
          const check = t.status === "Completed" ? "✅" : "▫️";
          const priority = t.priority === "Urgent" ? " 🔴" : "";
          const time = t.dueTime ? ` (${t.dueTime})` : "";
          return `${idx + 1}. ${check} *${t.title}*${time}${priority}`;
        })
        .join("\n");

      return (
        `📋 *Today's Tasks for ${userName}:*\n\n${formatted}\n\n` +
        `_Reply "done <#>" to mark a task complete!_`
      );
    }

    // 8. GOALS LIST
    case "LIST_GOALS": {
      const goals = await getActiveGoals(userId, 5);

      if (goals.length === 0) {
        return `🎯 *No active goals found!*\n\nCreate a goal by replying: _goal <name> by <date>_`;
      }

      const formatted = goals
        .map((g, idx) => {
          const targetStr = g.targetDate
            ? ` (Target: ${new Date(g.targetDate).toLocaleDateString([], { month: "short", day: "numeric" })})`
            : "";
          return `${idx + 1}. 🏆 *${g.name}* — ${Math.round(g.progress)}%${targetStr}`;
        })
        .join("\n");

      return `🎯 *Your Active Goals:*\n\n${formatted}`;
    }

    // 9. UNKNOWN / UNRECOGNIZED COMMAND FALLBACK
    case "UNKNOWN":
    default: {
      const raw = command.rawText.trim();
      const lower = raw.toLowerCase();

      let smartTip = "";
      if (lower.includes("remind") || lower.includes("tomorrow") || lower.includes("pm") || lower.includes("am")) {
        smartTip = `💡 *Tip for Reminders:* Try:\n👉 _remind me tomorrow at 9 AM to ${raw.replace(/remind\s*(me)?/i, "").trim() || "finish task"}_\n\n`;
      } else if (lower.includes("note") || lower.includes("write") || lower.includes("save")) {
        smartTip = `💡 *Tip for Notes:* Try:\n👉 _note ${raw.replace(/^(note|write|save)\s*/i, "").trim() || "your note text here"}_\n\n`;
      } else if (lower.includes("goal") || lower.includes("target")) {
        smartTip = `💡 *Tip for Goals:* Try:\n👉 _goal ${raw.replace(/^goal\s*/i, "").trim() || "reach 100 users"} by next month_\n\n`;
      }

      return (
        `🤔 *Command not recognized*\n` +
        `I couldn't understand: "_${raw.slice(0, 60)}${raw.length > 60 ? "..." : ""}_"\n\n` +
        smartTip +
        `📋 *Try using one of these example syntaxes:*\n\n` +
        `📝 *Save Note:*\n` +
        `👉 \`note <your text>\`\n` +
        `_e.g. note Met with designer, approved color palette_\n\n` +
        `⏰ *Set Reminder:*\n` +
        `👉 \`remind me <when> to <task>\`\n` +
        `_e.g. remind me tomorrow at 9 AM to call client_\n\n` +
        `🎯 *Create Goal:*\n` +
        `👉 \`goal <title> by <date>\`\n` +
        `_e.g. goal launch beta app by Dec 31_\n\n` +
        `✅ *Complete Task:*\n` +
        `👉 \`done <task name or #>\`\n` +
        `_e.g. done call client_ or _done 1_\n\n` +
        `🔍 *Search Notes:*\n` +
        `👉 \`find my notes about <term>\`\n` +
        `_e.g. find my notes about design_\n\n` +
        `📊 *Quick Queries:*\n` +
        `👉 \`today\` — View today's agenda\n` +
        `👉 \`goals\` — View active goals\n` +
        `👉 \`help\` — Full command menu`
      );
    }
  }
}
