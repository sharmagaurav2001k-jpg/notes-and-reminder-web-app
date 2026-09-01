/**
 * Recurrence Engine for Tasks & Reminders
 * Supports daily, weekdays, weekly, monthly (e.g. 5th of every month), yearly, and custom intervals.
 */

export interface StructuredRecurrenceRule {
  frequency: "daily" | "weekdays" | "weekly" | "monthly" | "yearly" | "custom";
  interval?: number; // e.g. every 2 weeks / every 3 months (default: 1)
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayOfMonth?: number; // 1 - 31 (e.g. 5th of every month)
  endDate?: string | null; // ISO Date string after which recurrence stops
  count?: number | null; // Max number of occurrences
}

export type RecurrenceInput = string | StructuredRecurrenceRule | null | undefined;

/**
 * Parses a recurrence rule from JSON string, shorthand string, or object into StructuredRecurrenceRule
 */
export function parseRecurrenceRule(rule: RecurrenceInput): StructuredRecurrenceRule | null {
  if (!rule) return null;

  if (typeof rule === "object") {
    return rule;
  }

  const trimmed = rule.trim();
  if (!trimmed) return null;

  // Attempt JSON parse first
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.frequency) {
        return parsed as StructuredRecurrenceRule;
      }
    } catch {
      // fallback to shorthand parsing
    }
  }

  // Shorthand string parsing
  const lower = trimmed.toLowerCase();

  if (lower === "daily" || lower === "every day" || lower === "1d") {
    return { frequency: "daily", interval: 1 };
  }

  if (lower === "weekdays" || lower === "workdays" || lower === "mon-fri") {
    return { frequency: "weekdays", daysOfWeek: [1, 2, 3, 4, 5] };
  }

  if (lower === "weekly" || lower === "every week" || lower === "1w") {
    return { frequency: "weekly", interval: 1 };
  }

  if (lower === "biweekly" || lower === "every 2 weeks" || lower === "2w") {
    return { frequency: "weekly", interval: 2 };
  }

  if (lower === "monthly" || lower === "every month" || lower === "1m") {
    return { frequency: "monthly", interval: 1 };
  }

  if (lower === "yearly" || lower === "every year" || lower === "annual" || lower === "1y") {
    return { frequency: "yearly", interval: 1 };
  }

  // Pattern: "monthly_on_day_5" or "monthly:5" or "5th of every month"
  const monthlyDayMatch = lower.match(/monthly(?:_on_day_|\s+on\s+day\s+|\:)(\d+)/) ||
    lower.match(/(\d+)(?:st|nd|rd|th)?\s+of\s+every\s+month/);
  if (monthlyDayMatch) {
    const day = parseInt(monthlyDayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      return { frequency: "monthly", interval: 1, dayOfMonth: day };
    }
  }

  return { frequency: "daily", interval: 1 };
}

/**
 * Generates human-friendly label for a recurrence rule
 */
export function formatRecurrenceLabel(ruleInput: RecurrenceInput): string {
  const parsed = parseRecurrenceRule(ruleInput);
  if (!parsed) return "Does not repeat";

  const { frequency, interval = 1, dayOfMonth, daysOfWeek } = parsed;

  if (frequency === "daily") {
    return interval > 1 ? `Every ${interval} days` : "Daily";
  }

  if (frequency === "weekdays") {
    return "Every weekday (Mon–Fri)";
  }

  if (frequency === "weekly") {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    if (daysOfWeek && daysOfWeek.length > 0) {
      const names = daysOfWeek.map((d) => dayNames[d]).join(", ");
      return interval > 1 ? `Every ${interval} weeks on ${names}` : `Weekly on ${names}`;
    }
    return interval > 1 ? `Every ${interval} weeks` : "Weekly";
  }

  if (frequency === "monthly") {
    if (dayOfMonth) {
      const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };
      return interval > 1
        ? `Every ${interval} months on the ${getOrdinal(dayOfMonth)}`
        : `Monthly on the ${getOrdinal(dayOfMonth)}`;
    }
    return interval > 1 ? `Every ${interval} months` : "Monthly";
  }

  if (frequency === "yearly") {
    return interval > 1 ? `Every ${interval} years` : "Yearly";
  }

  return "Custom recurrence";
}

/**
 * Calculates the next occurrence Date based on the recurrence rule.
 * Always ensures the next date is in the future relative to the completion moment or base date.
 */
export function calculateNextDueDate(
  currentDueDate: Date | string | null | undefined,
  ruleInput: RecurrenceInput,
  referenceDate: Date = new Date()
): Date | null {
  const parsed = parseRecurrenceRule(ruleInput);
  if (!parsed) return null;

  // Base date from which to step forward
  const base = currentDueDate ? new Date(currentDueDate) : new Date(referenceDate);
  const interval = Math.max(parsed.interval || 1, 1);
  const next = new Date(base);

  const { frequency, dayOfMonth, daysOfWeek, endDate } = parsed;

  switch (frequency) {
    case "daily": {
      do {
        next.setDate(next.getDate() + interval);
      } while (next <= referenceDate);
      break;
    }

    case "weekdays": {
      do {
        next.setDate(next.getDate() + 1);
        const day = next.getDay();
        // If Saturday (6), move to Monday (+2)
        if (day === 6) next.setDate(next.getDate() + 2);
        // If Sunday (0), move to Monday (+1)
        if (day === 0) next.setDate(next.getDate() + 1);
      } while (next <= referenceDate);
      break;
    }

    case "weekly": {
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Find next designated day of week
        const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
        let found = false;
        let attempts = 0;
        while (!found && attempts < 100) {
          next.setDate(next.getDate() + 1);
          if (sortedDays.includes(next.getDay()) && next > referenceDate) {
            found = true;
          }
          attempts++;
        }
      } else {
        do {
          next.setDate(next.getDate() + 7 * interval);
        } while (next <= referenceDate);
      }
      break;
    }

    case "monthly": {
      if (dayOfMonth && dayOfMonth >= 1 && dayOfMonth <= 31) {
        // e.g. 5th of every month
        do {
          next.setMonth(next.getMonth() + interval);
          // Clamp to max days in target month
          const maxDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
          next.setDate(Math.min(dayOfMonth, maxDays));
        } while (next <= referenceDate);
      } else {
        const originalDay = base.getDate();
        do {
          next.setMonth(next.getMonth() + interval);
          const maxDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
          next.setDate(Math.min(originalDay, maxDays));
        } while (next <= referenceDate);
      }
      break;
    }

    case "yearly": {
      do {
        next.setFullYear(next.getFullYear() + interval);
      } while (next <= referenceDate);
      break;
    }

    default: {
      next.setDate(next.getDate() + interval);
      break;
    }
  }

  // If past specified endDate, recurrence has finished
  if (endDate && new Date(endDate) < next) {
    return null;
  }

  return next;
}
