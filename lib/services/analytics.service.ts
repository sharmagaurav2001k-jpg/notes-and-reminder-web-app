import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface DailyProductivityScore {
  id: string;
  userId: string;
  date: Date;
  score: number;
  taskScore: number;
  goalScore: number;
  noteScore: number;
  streakDays: number;
  tasksCompleted: number;
  tasksTotal: number;
  goalsProgressed: number;
  notesCreated: number;
  focusMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskTrendPoint {
  date: string;
  completed: number;
  created: number;
}

export interface GoalVelocityPoint {
  date: string;
  goalsActive: number;
  goalsCompleted: number;
}

export interface TimeDistribution {
  byPriority: { priority: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

export interface HeatmapPoint {
  date: string;
  score: number;
  level: number; // 0=none, 1=low(<25), 2=medium(<50), 3=high(<75), 4=very-high(>=75)
}

export interface Insight {
  type: string;
  title: string;
  message: string;
}

/* ------------------------------------------------------------------ */
/* Date helpers (UTC day boundaries)                                   */
/* ------------------------------------------------------------------ */

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, amount: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + amount);
  return d;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function normalizeDays(days: number, fallback = 30): number {
  if (!Number.isFinite(days) || days <= 0) return fallback;
  return Math.min(Math.floor(days), 365);
}

function emptyScoreRecord(userId: string, date: Date): DailyProductivityScore {
  return {
    id: "",
    userId,
    date,
    score: 0,
    taskScore: 0,
    goalScore: 0,
    noteScore: 0,
    streakDays: 0,
    tasksCompleted: 0,
    tasksTotal: 0,
    goalsProgressed: 0,
    notesCreated: 0,
    focusMinutes: 0,
    createdAt: date,
    updatedAt: date,
  };
}

/* ------------------------------------------------------------------ */
/* Daily productivity score                                            */
/* ------------------------------------------------------------------ */

/**
 * Calculate (and persist) the productivity score for a single day.
 * Formula:
 *   taskScore = (completedTasks / max(totalTasksOnDate, 1)) * 40
 *   goalScore = min(goalsProgressed * 10, 30)
 *   noteScore = min(notesCreated * 3, 30)
 *   score     = min(taskScore + goalScore + noteScore, 100)
 */
export async function calculateDailyProductivityScore(
  userId: string,
  date?: Date
): Promise<DailyProductivityScore> {
  const target = date ? new Date(date) : new Date();
  const dayStart = startOfDay(target);
  const dayEnd = endOfDay(target);

  const [tasksCompleted, tasksTotal, goalsProgressed, notesCreated] =
    await Promise.all([
      // Tasks completed on this date
      prisma.task.count({
        where: {
          userId,
          status: "Completed",
          completedAt: { gte: dayStart, lte: dayEnd },
        },
      }),
      // Total relevant tasks on this date (due, created, or completed that day)
      prisma.task.count({
        where: {
          userId,
          status: { not: "Cancelled" },
          OR: [
            { dueDate: { gte: dayStart, lte: dayEnd } },
            { createdAt: { gte: dayStart, lte: dayEnd } },
            { completedAt: { gte: dayStart, lte: dayEnd } },
          ],
        },
      }),
      // Goals that had any progress/activity on this date
      prisma.goal.count({
        where: {
          userId,
          status: { not: "Cancelled" },
          updatedAt: { gte: dayStart, lte: dayEnd },
        },
      }),
      // Notes created on this date
      prisma.note.count({
        where: { userId, createdAt: { gte: dayStart, lte: dayEnd } },
      }),
    ]);

  const taskScore = round1((tasksCompleted / Math.max(tasksTotal, 1)) * 40);
  const goalScore = round1(Math.min(goalsProgressed * 10, 30));
  const noteScore = round1(Math.min(notesCreated * 3, 30));
  const score = round1(Math.min(taskScore + goalScore + noteScore, 100));

  // Streak: consecutive days (ending at this date) with score > 0
  const streakWindowStart = addDays(dayStart, -365);
  const recentScores = await prisma.productivityScore.findMany({
    where: { userId, date: { gte: streakWindowStart, lte: dayEnd } },
    select: { date: true, score: true },
  });

  const scoreByDay = new Map<string, number>();
  for (const r of recentScores) {
    scoreByDay.set(dayKey(r.date), r.score);
  }
  // Today's freshly computed score takes precedence over any stored value
  scoreByDay.set(dayKey(dayStart), score);

  let streakDays = 0;
  let cursor = dayStart;
  while ((scoreByDay.get(dayKey(cursor)) ?? 0) > 0) {
    streakDays++;
    if (streakDays >= 366) break;
    cursor = addDays(cursor, -1);
  }

  const record = await prisma.productivityScore.upsert({
    where: { userId_date: { userId, date: dayStart } },
    update: {
      score,
      taskScore,
      goalScore,
      noteScore,
      streakDays,
      tasksCompleted,
      tasksTotal,
      goalsProgressed,
      notesCreated,
    },
    create: {
      userId,
      date: dayStart,
      score,
      taskScore,
      goalScore,
      noteScore,
      streakDays,
      tasksCompleted,
      tasksTotal,
      goalsProgressed,
      notesCreated,
    },
  });

  return record;
}

/* ------------------------------------------------------------------ */
/* History / trends                                                    */
/* ------------------------------------------------------------------ */

/** Last N days of productivity scores, ascending, missing dates filled with 0. */
export async function getProductivityHistory(
  userId: string,
  days: number
): Promise<DailyProductivityScore[]> {
  const safeDays = normalizeDays(days);
  const today = startOfDay(new Date());
  const rangeStart = addDays(today, -(safeDays - 1));
  const rangeEnd = endOfDay(today);

  const records = await prisma.productivityScore.findMany({
    where: { userId, date: { gte: rangeStart, lte: rangeEnd } },
    orderBy: { date: "asc" },
  });

  const byDay = new Map<string, DailyProductivityScore>();
  for (const r of records) {
    byDay.set(dayKey(r.date), {
      id: r.id,
      userId: r.userId,
      date: r.date,
      score: r.score,
      taskScore: r.taskScore,
      goalScore: r.goalScore,
      noteScore: r.noteScore,
      streakDays: r.streakDays,
      tasksCompleted: r.tasksCompleted,
      tasksTotal: r.tasksTotal,
      goalsProgressed: r.goalsProgressed,
      notesCreated: r.notesCreated,
      focusMinutes: r.focusMinutes,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  }

  const history: DailyProductivityScore[] = [];
  for (let i = 0; i < safeDays; i++) {
    const day = addDays(rangeStart, i);
    history.push(byDay.get(dayKey(day)) ?? emptyScoreRecord(userId, day));
  }
  return history;
}

/** Per-day completed/created task counts for the last N days. */
export async function getTaskCompletionTrend(
  userId: string,
  days: number
): Promise<TaskTrendPoint[]> {
  const safeDays = normalizeDays(days);
  const today = startOfDay(new Date());
  const rangeStart = addDays(today, -(safeDays - 1));
  const rangeEnd = endOfDay(today);

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      OR: [
        { completedAt: { gte: rangeStart, lte: rangeEnd } },
        { createdAt: { gte: rangeStart, lte: rangeEnd } },
      ],
    },
    select: { completedAt: true, createdAt: true },
  });

  const completedByDay = new Map<string, number>();
  const createdByDay = new Map<string, number>();
  for (let i = 0; i < safeDays; i++) {
    const key = dayKey(addDays(rangeStart, i));
    completedByDay.set(key, 0);
    createdByDay.set(key, 0);
  }

  for (const t of tasks) {
    if (t.completedAt) {
      const key = dayKey(t.completedAt);
      if (completedByDay.has(key)) {
        completedByDay.set(key, (completedByDay.get(key) ?? 0) + 1);
      }
    }
    const createdKey = dayKey(t.createdAt);
    if (createdByDay.has(createdKey)) {
      createdByDay.set(createdKey, (createdByDay.get(createdKey) ?? 0) + 1);
    }
  }

  const trend: TaskTrendPoint[] = [];
  for (let i = 0; i < safeDays; i++) {
    const key = dayKey(addDays(rangeStart, i));
    trend.push({
      date: key,
      completed: completedByDay.get(key) ?? 0,
      created: createdByDay.get(key) ?? 0,
    });
  }
  return trend;
}

/**
 * Per-day goal movement for the last N days.
 * Progress history is not tracked, so we approximate: a goal counts as
 * "active/moved" on a day if it was updated then and is not Cancelled.
 */
export async function getGoalVelocity(
  userId: string,
  days: number
): Promise<GoalVelocityPoint[]> {
  const safeDays = normalizeDays(days);
  const today = startOfDay(new Date());
  const rangeStart = addDays(today, -(safeDays - 1));
  const rangeEnd = endOfDay(today);

  const goals = await prisma.goal.findMany({
    where: { userId, updatedAt: { gte: rangeStart, lte: rangeEnd } },
    select: { updatedAt: true, status: true },
  });

  const activeByDay = new Map<string, number>();
  const completedByDay = new Map<string, number>();
  for (let i = 0; i < safeDays; i++) {
    const key = dayKey(addDays(rangeStart, i));
    activeByDay.set(key, 0);
    completedByDay.set(key, 0);
  }

  for (const g of goals) {
    const key = dayKey(g.updatedAt);
    if (!activeByDay.has(key)) continue;
    if (g.status !== "Cancelled") {
      activeByDay.set(key, (activeByDay.get(key) ?? 0) + 1);
    }
    if (g.status === "Completed") {
      completedByDay.set(key, (completedByDay.get(key) ?? 0) + 1);
    }
  }

  const velocity: GoalVelocityPoint[] = [];
  for (let i = 0; i < safeDays; i++) {
    const key = dayKey(addDays(rangeStart, i));
    velocity.push({
      date: key,
      goalsActive: activeByDay.get(key) ?? 0,
      goalsCompleted: completedByDay.get(key) ?? 0,
    });
  }
  return velocity;
}

/** Task composition grouped by priority and status over the last N days. */
export async function getTimeDistribution(
  userId: string,
  days: number
): Promise<TimeDistribution> {
  const safeDays = normalizeDays(days);
  const today = startOfDay(new Date());
  const rangeStart = addDays(today, -(safeDays - 1));
  const rangeEnd = endOfDay(today);

  const tasks = await prisma.task.findMany({
    where: { userId, updatedAt: { gte: rangeStart, lte: rangeEnd } },
    select: { priority: true, status: true },
  });

  const priorityCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();

  for (const t of tasks) {
    priorityCounts.set(t.priority, (priorityCounts.get(t.priority) ?? 0) + 1);
    statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
  }

  return {
    byPriority: Array.from(priorityCounts.entries())
      .map(([priority, count]) => ({ priority, count }))
      .sort((a, b) => b.count - a.count),
    byStatus: Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** GitHub-style heatmap of productivity levels for the last N weeks. */
export async function getHeatmapData(
  userId: string,
  weeks: number
): Promise<HeatmapPoint[]> {
  const safeWeeks = Math.max(
    1,
    Math.min(Number.isFinite(weeks) ? Math.floor(weeks) : 16, 52)
  );
  const today = startOfDay(new Date());
  const totalDays = safeWeeks * 7;
  const rangeStart = addDays(today, -(totalDays - 1));
  const rangeEnd = endOfDay(today);

  const records = await prisma.productivityScore.findMany({
    where: { userId, date: { gte: rangeStart, lte: rangeEnd } },
    select: { date: true, score: true },
  });

  const scoreByDay = new Map<string, number>();
  for (const r of records) {
    scoreByDay.set(dayKey(r.date), r.score);
  }

  const levelFor = (score: number): number => {
    if (score <= 0) return 0;
    if (score < 25) return 1;
    if (score < 50) return 2;
    if (score < 75) return 3;
    return 4;
  };

  const heatmap: HeatmapPoint[] = [];
  for (let i = 0; i < totalDays; i++) {
    const key = dayKey(addDays(rangeStart, i));
    const score = scoreByDay.get(key) ?? 0;
    heatmap.push({ date: key, score, level: levelFor(score) });
  }
  return heatmap;
}

/* ------------------------------------------------------------------ */
/* Weekly review                                                       */
/* ------------------------------------------------------------------ */

/** Build (and persist) a rule-based review of the last 7 days. */
export async function generateWeeklyReview(userId: string) {
  const today = startOfDay(new Date());
  const weekStart = addDays(today, -6);
  const weekEnd = endOfDay(today);

  const [totalTasks, completedTaskList, notes, goalUpdates, scoreRecords, noteTags] =
    await Promise.all([
      prisma.task.count({
        where: {
          userId,
          status: { not: "Cancelled" },
          OR: [
            { dueDate: { gte: weekStart, lte: weekEnd } },
            { createdAt: { gte: weekStart, lte: weekEnd } },
            { completedAt: { gte: weekStart, lte: weekEnd } },
          ],
        },
      }),
      prisma.task.findMany({
        where: {
          userId,
          status: "Completed",
          completedAt: { gte: weekStart, lte: weekEnd },
        },
        select: { completedAt: true },
      }),
      prisma.note.findMany({
        where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
        select: { category: { select: { name: true } } },
      }),
      prisma.goal.findMany({
        where: { userId, updatedAt: { gte: weekStart, lte: weekEnd } },
        select: { status: true },
      }),
      prisma.productivityScore.findMany({
        where: { userId, date: { gte: weekStart, lte: weekEnd } },
        select: { score: true },
      }),
      prisma.noteTag.findMany({
        where: {
          note: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
        },
        include: { tag: { select: { name: true } } },
      }),
    ]);

  const completedTasks = completedTaskList.length;
  const notesCreated = notes.length;
  const goalsProgressed = goalUpdates.filter((g) => g.status !== "Cancelled").length;
  const goalsCompleted = goalUpdates.filter((g) => g.status === "Completed").length;
  const avgProductivityScore = scoreRecords.length
    ? round1(scoreRecords.reduce((sum, r) => sum + r.score, 0) / scoreRecords.length)
    : 0;

  // Tasks completed per day (Mon-Sun style labels, chronological)
  const countsByDay = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    countsByDay.set(dayKey(addDays(weekStart, i)), 0);
  }
  for (const t of completedTaskList) {
    if (!t.completedAt) continue;
    const key = dayKey(t.completedAt);
    if (countsByDay.has(key)) {
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
    }
  }
  const tasksCompletedByDay = Array.from(countsByDay.entries()).map(
    ([key, count]) => ({
      day: WEEKDAY_NAMES[new Date(`${key}T00:00:00Z`).getUTCDay()],
      count,
    })
  );

  // Top 3 categories from notes created this week
  const categoryCounts = new Map<string, number>();
  for (const n of notes) {
    const name = n.category?.name;
    if (name) categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + 1);
  }
  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  // Top 5 tags from notes created this week
  const tagCounts = new Map<string, number>();
  for (const nt of noteTags) {
    const name = nt.tag?.name;
    if (name) tagCounts.set(name, (tagCounts.get(name) ?? 0) + 1);
  }
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Highlights
  const bestDay = tasksCompletedByDay.reduce(
    (best, cur) => (cur.count > best.count ? cur : best),
    { day: "-", count: 0 }
  );

  const highlightLines: string[] = [
    `${completedTasks} of ${totalTasks} tasks completed`,
  ];
  if (bestDay.count > 0) {
    highlightLines.push(`Best day: ${bestDay.day} (${bestDay.count} tasks)`);
  }
  if (topCategories.length > 0) {
    highlightLines.push(
      `Most active category: ${topCategories[0].name} (${topCategories[0].count} notes)`
    );
  }
  if (topTags.length > 0) {
    highlightLines.push(
      `Top tag: #${topTags[0].name} (${topTags[0].count} notes)`
    );
  }
  highlightLines.push(
    `Goals: ${goalsCompleted} completed, ${goalsProgressed} with movement`
  );
  const highlights = highlightLines.join("\n");

  // Rule-based summary
  const completionRate =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : -1;

  let base: string;
  if (totalTasks === 0) {
    base = "A quiet week with no task activity. Time to plan ahead and set up next week's goals!";
  } else if (completionRate > 80) {
    base = `Outstanding week! You crushed it with ${completedTasks} tasks completed.`;
  } else if (completionRate > 50) {
    base = `Solid week. ${completedTasks} out of ${totalTasks} tasks done. Keep pushing!`;
  } else if (completionRate > 30) {
    base = `Steady progress. ${completedTasks} tasks completed. Room to grow next week.`;
  } else {
    base = `Tough week. Only ${completedTasks} tasks completed. Let's bounce back!`;
  }

  const latestScore = await prisma.productivityScore.findFirst({
    where: { userId },
    orderBy: { date: "desc" },
    select: { streakDays: true, date: true },
  });
  const activeStreak =
    latestScore &&
    latestScore.streakDays > 0 &&
    latestScore.date >= addDays(startOfDay(new Date()), -1)
      ? latestScore.streakDays
      : 0;
  const streakSentence =
    activeStreak > 0
      ? `You're on a ${activeStreak}-day productivity streak!`
      : "Build a streak by staying active every day.";

  const bestDaySentence =
    bestDay.count > 0
      ? `Your best day was ${bestDay.day} with ${bestDay.count} tasks.`
      : "No standout day yet — consistency beats intensity.";

  let goalSentence: string;
  if (goalsCompleted > 0) {
    goalSentence = `You completed ${goalsCompleted} goal${goalsCompleted === 1 ? "" : "s"} and moved ${goalsProgressed} other${goalsProgressed === 1 ? "" : "s"} forward.`;
  } else if (goalsProgressed > 0) {
    goalSentence = `You made progress on ${goalsProgressed} goal${goalsProgressed === 1 ? "" : "s"} — finish what you started!`;
  } else {
    goalSentence = "No goal movement this week — pick one goal and push it forward.";
  }

  const summary = [base, streakSentence, bestDaySentence, goalSentence].join(" ");

  const review = await prisma.weeklyReview.upsert({
    where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
    update: {
      weekEndDate: weekEnd,
      totalTasks,
      completedTasks,
      tasksCompletedByDay,
      notesCreated,
      goalsProgressed,
      goalsCompleted,
      avgProductivityScore,
      topCategories,
      topTags,
      highlights,
      summary,
    },
    create: {
      userId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      totalTasks,
      completedTasks,
      tasksCompletedByDay,
      notesCreated,
      goalsProgressed,
      goalsCompleted,
      avgProductivityScore,
      topCategories,
      topTags,
      highlights,
      summary,
    },
  });

  return review;
}

/* ------------------------------------------------------------------ */
/* AI-style insights (rule-based)                                      */
/* ------------------------------------------------------------------ */

function parseDueTimeHour(dueTime: string): number | null {
  const match = dueTime.trim().match(/^(\d{1,2})/);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  if (Number.isNaN(hour) || hour < 0 || hour > 23) return null;
  if (/pm/i.test(dueTime) && hour < 12) hour += 12;
  if (/am/i.test(dueTime) && hour === 12) hour = 0;
  return hour;
}

/** Rule-based insights derived from the last 30 days of activity. */
export async function getAIInsights(userId: string): Promise<Insight[]> {
  const today = startOfDay(new Date());
  const rangeStart = addDays(today, -29);
  const rangeEnd = endOfDay(today);
  const midStart = addDays(today, -14);

  const [
    scoreRecords,
    dueTimeTasks,
    goalTasks,
    recentNotes,
    bestStreakAgg,
    latestScore,
    createdFirstHalf,
    completedFirstHalf,
    createdSecondHalf,
    completedSecondHalf,
  ] = await Promise.all([
    prisma.productivityScore.findMany({
      where: { userId, date: { gte: rangeStart, lte: rangeEnd } },
      select: {
        date: true,
        score: true,
        taskScore: true,
        goalScore: true,
        noteScore: true,
      },
    }),
    prisma.task.findMany({
      where: {
        userId,
        dueTime: { not: null },
        OR: [
          { completedAt: { gte: rangeStart, lte: rangeEnd } },
          { createdAt: { gte: rangeStart, lte: rangeEnd } },
        ],
      },
      select: { dueTime: true, status: true },
    }),
    prisma.task.findMany({
      where: {
        userId,
        goalId: { not: null },
        createdAt: { gte: rangeStart, lte: rangeEnd },
      },
      select: { goal: { select: { type: true } } },
    }),
    prisma.note.findMany({
      where: { userId, createdAt: { gte: rangeStart, lte: rangeEnd } },
      select: { category: { select: { name: true } } },
    }),
    prisma.productivityScore.aggregate({
      where: { userId },
      _max: { streakDays: true },
    }),
    prisma.productivityScore.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
      select: { streakDays: true, date: true },
    }),
    prisma.task.count({
      where: { userId, createdAt: { gte: rangeStart, lt: midStart } },
    }),
    prisma.task.count({
      where: { userId, completedAt: { gte: rangeStart, lt: midStart } },
    }),
    prisma.task.count({
      where: { userId, createdAt: { gte: midStart, lte: rangeEnd } },
    }),
    prisma.task.count({
      where: { userId, completedAt: { gte: midStart, lte: rangeEnd } },
    }),
  ]);

  const insights: Insight[] = [];

  // 1. Most productive day of week (avg score per weekday)
  if (scoreRecords.length > 0) {
    const dowAgg = new Map<number, { sum: number; count: number }>();
    for (const r of scoreRecords) {
      const dow = r.date.getUTCDay();
      const agg = dowAgg.get(dow) ?? { sum: 0, count: 0 };
      agg.sum += r.score;
      agg.count += 1;
      dowAgg.set(dow, agg);
    }
    let bestDow = -1;
    let bestAvg = -1;
    for (const [dow, agg] of dowAgg.entries()) {
      const avg = agg.sum / agg.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestDow = dow;
      }
    }
    if (bestDow >= 0) {
      insights.push({
        type: "peak-day",
        title: "Most Productive Day",
        message: `${WEEKDAY_NAMES[bestDow]} is your strongest day, averaging ${round1(bestAvg)} productivity points.`,
      });
    }
  } else {
    insights.push({
      type: "peak-day",
      title: "Most Productive Day",
      message: "Not enough data yet to find your peak day — keep scoring days!",
    });
  }

  // 2. Most productive time period (based on task dueTime distribution)
  const completedWithTime = dueTimeTasks.filter((t) => t.status === "Completed");
  const timeSource = completedWithTime.length > 0 ? completedWithTime : dueTimeTasks;
  const timeBuckets: Record<string, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
  };
  for (const t of timeSource) {
    if (!t.dueTime) continue;
    const hour = parseDueTimeHour(t.dueTime);
    if (hour === null) continue;
    if (hour < 12) timeBuckets.morning += 1;
    else if (hour < 17) timeBuckets.afternoon += 1;
    else timeBuckets.evening += 1;
  }
  const totalTimed = Object.values(timeBuckets).reduce((a, b) => a + b, 0);
  if (totalTimed > 0) {
    const bestPeriod = Object.entries(timeBuckets).sort((a, b) => b[1] - a[1])[0];
    insights.push({
      type: "peak-time",
      title: "Most Productive Time",
      message: `You get the most done in the ${bestPeriod[0]} — ${bestPeriod[1]} of ${totalTimed} scheduled tasks land there. Protect that window.`,
    });
  } else {
    insights.push({
      type: "peak-time",
      title: "Most Productive Time",
      message: "No time patterns yet — add times to your tasks to discover when you're sharpest.",
    });
  }

  // 3. Category trend (which category gets most attention from notes)
  const noteCategoryCounts = new Map<string, number>();
  for (const n of recentNotes) {
    const name = n.category?.name;
    if (name) noteCategoryCounts.set(name, (noteCategoryCounts.get(name) ?? 0) + 1);
  }
  if (noteCategoryCounts.size > 0) {
    const [topCat, topCatCount] = Array.from(noteCategoryCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];
    insights.push({
      type: "category",
      title: "Category Focus",
      message: `"${topCat}" is getting the most attention lately with ${topCatCount} note${topCatCount === 1 ? "" : "s"} in the last 30 days.`,
    });
  } else {
    insights.push({
      type: "category",
      title: "Category Focus",
      message: "No categorized notes in the last 30 days — organize notes into categories to spot trends.",
    });
  }

  // 4. Streak info
  const activeStreak =
    latestScore &&
    latestScore.streakDays > 0 &&
    latestScore.date >= addDays(today, -1)
      ? latestScore.streakDays
      : 0;
  if (activeStreak > 0) {
    insights.push({
      type: "streak",
      title: "Current Streak",
      message: `🔥 You're on a ${activeStreak}-day streak! Don't break the chain — score at least 1 point today.`,
    });
  } else {
    insights.push({
      type: "streak",
      title: "Current Streak",
      message: "No active streak right now. Complete a task or write a note today to start one!",
    });
  }

  // 5. Completion rate trend (first half vs second half of the window)
  const totalCreated = createdFirstHalf + createdSecondHalf;
  if (totalCreated === 0) {
    insights.push({
      type: "trend",
      title: "Completion Trend",
      message: "No task activity in the last 30 days to measure a trend.",
    });
  } else {
    const rateFirst = (completedFirstHalf / Math.max(createdFirstHalf, 1)) * 100;
    const rateSecond = (completedSecondHalf / Math.max(createdSecondHalf, 1)) * 100;
    const diff = rateSecond - rateFirst;
    if (createdFirstHalf === 0 && createdSecondHalf === 0) {
      insights.push({
        type: "trend",
        title: "Completion Trend",
        message: "Not enough created tasks to measure a completion trend.",
      });
    } else if (diff > 10) {
      insights.push({
        type: "trend",
        title: "Completion Trend",
        message: `📈 Your completion rate is improving — ${round1(rateSecond)}% recently vs ${round1(rateFirst)}% earlier. Momentum is on your side!`,
      });
    } else if (diff < -10) {
      insights.push({
        type: "trend",
        title: "Completion Trend",
        message: `📉 Your completion rate dipped — ${round1(rateSecond)}% recently vs ${round1(rateFirst)}% earlier. Try smaller, clearer tasks.`,
      });
    } else {
      insights.push({
        type: "trend",
        title: "Completion Trend",
        message: `➡️ Your completion rate is stable at around ${round1(rateSecond)}%. Steady is good — now scale it up.`,
      });
    }
  }

  // 6. Goal focus area (which goal type has the most tasks)
  const goalTypeCounts = new Map<string, number>();
  for (const t of goalTasks) {
    const type = t.goal?.type;
    if (type) goalTypeCounts.set(type, (goalTypeCounts.get(type) ?? 0) + 1);
  }
  if (goalTypeCounts.size > 0) {
    const [topType, topTypeCount] = Array.from(goalTypeCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];
    insights.push({
      type: "goal-focus",
      title: "Goal Focus Area",
      message: `Most of your goal-linked tasks (${topTypeCount}) belong to "${topType}" goals — that's where your energy is going.`,
    });
  } else {
    insights.push({
      type: "goal-focus",
      title: "Goal Focus Area",
      message: "No goal-linked tasks in the last 30 days — attach tasks to goals to make progress visible.",
    });
  }

  // 7. Best streak ever
  const bestStreakEver = bestStreakAgg._max.streakDays ?? 0;
  if (bestStreakEver > 0) {
    insights.push({
      type: "best-streak",
      title: "Best Streak Ever",
      message: `Your personal record is a ${bestStreakEver}-day streak. ${activeStreak >= bestStreakEver ? "You're matching it right now — new record incoming!" : "Beat it and set a new record!"}`,
    });
  } else {
    insights.push({
      type: "best-streak",
      title: "Best Streak Ever",
      message: "Your best streak is yet to come — start one today!",
    });
  }

  // 8. Average daily score
  const avgScore = scoreRecords.length
    ? round1(scoreRecords.reduce((s, r) => s + r.score, 0) / scoreRecords.length)
    : 0;
  insights.push({
    type: "average",
    title: "Average Daily Score",
    message:
      scoreRecords.length > 0
        ? `Your average daily score over the last 30 days is ${avgScore}/100.`
        : "No productivity data yet — complete tasks and notes to build your score.",
  });

  // 9. Productivity tip based on weak areas
  if (scoreRecords.length === 0) {
    insights.push({
      type: "tip",
      title: "Tip",
      message: "Start small: complete one task and capture one note today — small wins compound fast.",
    });
  } else {
    const avgTask = scoreRecords.reduce((s, r) => s + r.taskScore, 0) / scoreRecords.length;
    const avgGoal = scoreRecords.reduce((s, r) => s + r.goalScore, 0) / scoreRecords.length;
    const avgNote = scoreRecords.reduce((s, r) => s + r.noteScore, 0) / scoreRecords.length;

    const weakest = Math.min(avgTask, avgGoal, avgNote);
    let tip: string;
    if (weakest === avgTask) {
      tip = "Your task completion is the weakest area. Try scheduling 1-3 must-do tasks per day and clear them before anything else.";
    } else if (weakest === avgGoal) {
      tip = "Your goals aren't getting much attention. Spend 10 minutes a day nudging at least one goal forward.";
    } else {
      tip = "You rarely capture notes. Jot down ideas as they come — future you will thank you.";
    }
    insights.push({ type: "tip", title: "Tip", message: tip });
  }

  return insights;
}

/* ------------------------------------------------------------------ */
/* Dashboard payload                                                   */
/* ------------------------------------------------------------------ */

/** Combined payload for the analytics page. All queries run in parallel. */
export async function getDashboardAnalytics(userId: string) {
  const [todayScore, history, taskTrend, goalVelocity, timeDistribution, heatmap, insights] =
    await Promise.all([
      calculateDailyProductivityScore(userId).catch(() => null),
      getProductivityHistory(userId, 30),
      getTaskCompletionTrend(userId, 30),
      getGoalVelocity(userId, 30),
      getTimeDistribution(userId, 30),
      getHeatmapData(userId, 16),
      getAIInsights(userId).catch(() => []),
    ]);

  const avgScore30d = history.length
    ? round1(history.reduce((s, r) => s + r.score, 0) / history.length)
    : 0;

  let bestDay: { date: string; score: number } | null = null;
  for (const r of history) {
    if (!bestDay || r.score > bestDay.score) {
      bestDay = { date: dayKey(r.date), score: r.score };
    }
  }

  const tasksCompleted30d = taskTrend.reduce((s, d) => s + (d.completed ?? 0), 0);
  const tasksCreated30d = taskTrend.reduce((s, d) => s + (d.created ?? 0), 0);
  const completionRate = tasksCreated30d > 0 ? Math.round((tasksCompleted30d / tasksCreated30d) * 100) : 0;
  const latestGoal = goalVelocity.length > 0 ? goalVelocity[goalVelocity.length - 1] : null;

  return {
    todayScore: todayScore
      ? {
          score: todayScore.score,
          taskScore: todayScore.taskScore,
          goalScore: todayScore.goalScore,
          noteScore: todayScore.noteScore,
          streakDays: todayScore.streakDays,
        }
      : null,
    stats: {
      tasksThisMonth: tasksCompleted30d,
      tasksChangePct: 0,
      completionRate,
      currentStreak: todayScore?.streakDays ?? 0,
      notesThisMonth: todayScore?.notesCreated ?? 0,
      goalsActive: latestGoal?.goalsActive ?? 0,
    },
    summary: {
      todayScore: todayScore?.score ?? 0,
      currentStreak: todayScore?.streakDays ?? 0,
      avgScore30d,
      tasksCompleted30d,
      bestDay30d: bestDay,
    },
    history,
    taskTrend,
    goalVelocity,
    timeDistribution,
    heatmap,
    insights,
  };
}
