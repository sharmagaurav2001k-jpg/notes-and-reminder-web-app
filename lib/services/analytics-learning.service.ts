import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-helpers";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface StatsSummary {
  field: string;
  count: number;
  mean: number;
  median: number;
  mode: number;
  stdDev: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
  p90: number;
  p95: number;
  range: number;
  skewness: number;
}

export interface CorrelationResult {
  variableA: string;
  variableB: string;
  pearsonR: number;
  strength: string; // "none" | "weak" | "moderate" | "strong" | "very strong"
  direction: string; // "positive" | "negative" | "none"
  n: number;
}

export interface DistributionBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface HistogramData {
  field: string;
  buckets: DistributionBucket[];
  outlierCount: number;
  iqr: number;
  q1: number;
  q3: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
}

export interface DataTableInfo {
  name: string;
  description: string;
  columns: ColumnInfo[];
  rowCount: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

/* ------------------------------------------------------------------ */
/* Allowed tables & columns for SQL Playground (safety)               */
/* ------------------------------------------------------------------ */

const ALLOWED_TABLES = [
  "ProductivityScore",
  "WeeklyReview",
  "Task",
  "Note",
  "Goal",
  "Category",
  "Tag",
  "Reminder",
  "Project",
  "Milestone",
] as const;

const COLUMN_ALLOWLIST: Record<string, string[]> = {
  ProductivityScore: ["id","userId","date","score","taskScore","goalScore","noteScore","streakDays","tasksCompleted","tasksTotal","goalsProgressed","notesCreated","focusMinutes","createdAt","updatedAt"],
  WeeklyReview: ["id","userId","weekStartDate","weekEndDate","totalTasks","completedTasks","notesCreated","goalsProgressed","goalsCompleted","avgProductivityScore","highlights","summary","createdAt"],
  Task: ["id","userId","title","description","dueDate","dueTime","priority","status","repeatRule","goalId","projectId","completedAt","isNotified","notifiedAt","remindAt","createdAt","updatedAt"],
  Note: ["id","title","content","categoryId","projectId","isPinned","isArchived","isFavorite","color","userId","createdAt","updatedAt"],
  Goal: ["id","userId","name","description","category","type","startDate","targetDate","priority","status","progress","color","createdAt","updatedAt"],
  Category: ["id","name","color","userId","createdAt","updatedAt"],
  Tag: ["id","name","color","userId","createdAt","updatedAt"],
  Reminder: ["id","title","dueDate","priority","isCompleted","userId","createdAt","updatedAt"],
  Project: ["id","userId","goalId","name","description","status","createdAt","updatedAt"],
  Milestone: ["id","goalId","title","description","targetDate","isCompleted","completedAt","order","createdAt","updatedAt"],
};

/* ------------------------------------------------------------------ */
/* SQL Safety Validator                                               */
/* ------------------------------------------------------------------ */

function validateSqlQuery(sql: string, userId: string): string {
  const trimmed = sql.trim();
  
  // Only SELECT allowed
  if (!/^\s*SELECT\s/i.test(trimmed)) {
    throw new Error("Only SELECT queries are allowed. No INSERT, UPDATE, DELETE, DROP, etc.");
  }
  
  // Block dangerous keywords
  const blocked = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXEC|EXECUTE|CALL|SET|LOCK|UNLOCK)\b/i;
  if (blocked.test(trimmed)) {
    throw new Error("Dangerous SQL operation detected. Only read-only SELECT queries are permitted.");
  }
  
  // Block subqueries that might be dangerous
  if (/\(\s*SELECT\s/i.test(trimmed) && /\b(INSERT|UPDATE|DELETE|DROP|ALTER)\b/i.test(trimmed)) {
    throw new Error("Potentially dangerous subquery detected.");
  }
  
  // Check referenced tables
  for (const table of ALLOWED_TABLES) {
    const tableRegex = new RegExp(`\\b${table}\\b`, 'gi');
    if (tableRegex.test(trimmed)) {
      // Auto-prepend WHERE userId filter if not already present
      if (!new RegExp(`\\buserId\\b`, 'i').test(trimmed)) {
        // Find if there's a WHERE clause
        const hasWhere = /\bWHERE\b/i.test(trimmed);
        if (hasWhere) {
          return trimmed.replace(/\bWHERE\b/i, `WHERE "userId" = '${userId}' AND`);
        } else {
          // Insert WHERE before GROUP BY, ORDER BY, LIMIT, or at end
          const insertPoint = /\s+(GROUP\s+BY|ORDER\s+BY|LIMIT|HAVING)/i;
          if (insertPoint.test(trimmed)) {
            return trimmed.replace(insertPoint, ` WHERE "userId" = '${userId}' $1`);
          }
          return `${trimmed} WHERE "userId" = '${userId}'`;
        }
      }
      break;
    }
  }
  
  return trimmed;
}

/* ------------------------------------------------------------------ */
/* SQL Query Playground                                                */
/* ------------------------------------------------------------------ */

export async function executeSafeQuery(sql: string, userId: string): Promise<QueryResult> {
  const safeSql = validateSqlQuery(sql, userId);
  const start = performance.now();
  
  try {
    const result = await prisma.$queryRawUnsafe(safeSql) as Record<string, any>[];
    const elapsed = Math.round(performance.now() - start);
    
    if (!Array.isArray(result) || result.length === 0) {
      return { columns: [], rows: [], rowCount: 0, executionTimeMs: elapsed };
    }
    
    const columns = Object.keys(result[0]);
    return {
      columns,
      rows: result.map((row) => {
        const clean: Record<string, any> = {};
        for (const col of columns) {
          const val = row[col];
          if (val instanceof Date) {
            clean[col] = val.toISOString();
          } else {
            clean[col] = val;
          }
        }
        return clean;
      }),
      rowCount: result.length,
      executionTimeMs: elapsed,
    };
  } catch (error: any) {
 throw new Error(`SQL Error: ${error.message}`);
  }
}

export function getTableInfo(): DataTableInfo[] {
  return [
    {
      name: "ProductivityScore",
      description: "Daily productivity scores (0-100) with task, goal, and note breakdowns",
      columns: COLUMN_ALLOWLIST.ProductivityScore.map(c => ({ name: c, type: inferType(c, "ProductivityScore"), nullable: ["description","goalId","projectId","completedAt","notifiedAt","remindAt"].includes(c) })),
      rowCount: 0, // filled dynamically
    },
    {
      name: "Task",
      description: "All tasks with priority, status, due dates, and goal/project links",
      columns: COLUMN_ALLOWLIST.Task.map(c => ({ name: c, type: inferType(c, "Task"), nullable: ["description","dueDate","dueTime","goalId","projectId","completedAt","notifiedAt","remindAt"].includes(c) })),
      rowCount: 0,
    },
    {
      name: "Note",
      description: "Notes with categories, pin/favorite/archive status",
      columns: COLUMN_ALLOWLIST.Note.map(c => ({ name: c, type: inferType(c, "Note"), nullable: ["content","categoryId","projectId"].includes(c) })),
      rowCount: 0,
    },
    {
      name: "Goal",
      description: "Goals with progress tracking, milestones, and categories",
      columns: COLUMN_ALLOWLIST.Goal.map(c => ({ name: c, type: inferType(c, "Goal"), nullable: ["description","category","targetDate"].includes(c) })),
      rowCount: 0,
    },
  ];
}

function inferType(col: string, _table: string): string {
  const intCols = ["streakDays","tasksCompleted","tasksTotal","goalsProgressed","notesCreated","focusMinutes","totalTasks","completedTasks","goalsCompleted","order"];
  const floatCols = ["score","taskScore","goalScore","noteScore","avgProductivityScore","progress"];
  const boolCols = ["isPinned","isArchived","isFavorite","isCompleted","isNotified","whatsappVerified","whatsappNotifications","whatsappDailyDigest"];
  const dateCols = ["date","dueDate","completedAt","notifiedAt","remindAt","createdAt","updatedAt","weekStartDate","weekEndDate","startDate","targetDate"];
  if (intCols.includes(col)) return "integer";
  if (floatCols.includes(col)) return "float";
  if (boolCols.includes(col)) return "boolean";
  if (dateCols.includes(col)) return "datetime";
  if (col === "id" || col.endsWith("Id")) return "string (cuid)";
  return "string";
}

/* ------------------------------------------------------------------ */
/* Statistical Summary                                                 */
/* ------------------------------------------------------------------ */

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function calculatePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function calculateMode(values: number[]): number {
  const freq = new Map<number, number>();
  for (const v of values) freq.set(v, (freq.get(v) || 0) + 1);
  let maxCount = 0;
  let mode = values[0] || 0;
  for (const [val, count] of freq) {
    if (count > maxCount) { maxCount = count; mode = val; }
  }
  return mode;
}

function calculateSkewness(values: number[], mean: number, stdDev: number): number {
  if (values.length < 3 || stdDev === 0) return 0;
  const n = values.length;
  const m3 = values.reduce((s, v) => s + Math.pow((v - mean) / stdDev, 3), 0) / n;
  return m3;
}

export function computeStats(values: number[], field: string): StatsSummary {
  if (values.length === 0) {
    return { field, count: 0, mean: 0, median: 0, mode: 0, stdDev: 0, min: 0, max: 0, p25: 0, p75: 0, p90: 0, p95: 0, range: 0, skewness: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = calculateMean(values);
  const stdDev = calculateStdDev(values, mean);
  return {
    field,
    count: values.length,
    mean: Math.round(mean * 100) / 100,
    median: Math.round(calculateMedian(sorted) * 100) / 100,
    mode: calculateMode(values),
    stdDev: Math.round(stdDev * 100) / 100,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p25: Math.round(calculatePercentile(sorted, 25) * 100) / 100,
    p75: Math.round(calculatePercentile(sorted, 75) * 100) / 100,
    p90: Math.round(calculatePercentile(sorted, 90) * 100) / 100,
    p95: Math.round(calculatePercentile(sorted, 95) * 100) / 100,
    range: sorted[sorted.length - 1] - sorted[0],
    skewness: Math.round(calculateSkewness(values, mean, stdDev) * 100) / 100,
  };
}

export async function getProductivityStats(userId: string, days: number = 30): Promise<StatsSummary[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const scores = await prisma.productivityScore.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });
  
  if (scores.length === 0) return [];
  
  const fields: Array<{ key: keyof typeof scores[0]; label: string; isNumeric: boolean }> = [
    { key: "score", label: "Overall Score", isNumeric: true },
    { key: "taskScore", label: "Task Score", isNumeric: true },
    { key: "goalScore", label: "Goal Score", isNumeric: true },
    { key: "noteScore", label: "Note Score", isNumeric: true },
    { key: "streakDays", label: "Streak Days", isNumeric: true },
    { key: "tasksCompleted", label: "Tasks Completed", isNumeric: true },
    { key: "tasksTotal", label: "Total Tasks", isNumeric: true },
    { key: "notesCreated", label: "Notes Created", isNumeric: true },
  ];
  
  return fields
    .filter(f => f.isNumeric)
    .map(f => {
      const values = scores.map(s => Number(s[f.key]) || 0);
      return computeStats(values, f.label);
    });
}

/* ------------------------------------------------------------------ */
/* Correlation Analysis                                                */
/* ------------------------------------------------------------------ */

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  
  const meanX = calculateMean(x);
  const meanY = calculateMean(y);
  
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  
  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return num / den;
}

function interpretCorrelation(r: number): { strength: string; direction: string } {
  const absR = Math.abs(r);
  let strength = "none";
  if (absR >= 0.8) strength = "very strong";
  else if (absR >= 0.6) strength = "strong";
  else if (absR >= 0.4) strength = "moderate";
  else if (absR >= 0.2) strength = "weak";
  
  let direction = "none";
  if (absR >= 0.1) direction = r > 0 ? "positive" : "negative";
  
  return { strength, direction };
}

export async function getCorrelations(userId: string, days: number = 30): Promise<CorrelationResult[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const scores = await prisma.productivityScore.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });
  
  if (scores.length < 5) return [];
  
  const variables: Array<{ key: keyof typeof scores[0]; label: string }> = [
    { key: "score", label: "Overall Score" },
    { key: "taskScore", label: "Task Score" },
    { key: "goalScore", label: "Goal Score" },
    { key: "noteScore", label: "Note Score" },
    { key: "streakDays", label: "Streak Days" },
    { key: "tasksCompleted", label: "Tasks Done" },
    { key: "tasksTotal", label: "Total Tasks" },
    { key: "notesCreated", label: "Notes Created" },
    { key: "focusMinutes", label: "Focus Minutes" },
  ];
  
  const results: CorrelationResult[] = [];
  
  for (let i = 0; i < variables.length; i++) {
    for (let j = i + 1; j < variables.length; j++) {
      const x = scores.map(s => Number(s[variables[i].key]) || 0);
      const y = scores.map(s => Number(s[variables[j].key]) || 0);
      const r = pearsonCorrelation(x, y);
      const { strength, direction } = interpretCorrelation(r);
      
      if (strength !== "none") {
        results.push({
          variableA: variables[i].label,
          variableB: variables[j].label,
          pearsonR: Math.round(r * 1000) / 1000,
          strength,
          direction,
          n: scores.length,
        });
      }
    }
  }
  
  return results.sort((a, b) => Math.abs(b.pearsonR) - Math.abs(a.pearsonR));
}

/* ------------------------------------------------------------------ */
/* Distribution / Histogram                                            */
/* ------------------------------------------------------------------ */

export async function getDistribution(userId: string, field: string, days: number = 30, bucketCount: number = 10): Promise<HistogramData> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const fieldMap: Record<string, string> = {
    score: "score",
    taskScore: "taskScore",
    goalScore: "goalScore",
    noteScore: "noteScore",
    streakDays: "streakDays",
    tasksCompleted: "tasksCompleted",
    notesCreated: "notesCreated",
  };
  
  const prismaField = fieldMap[field] || "score";
  
  const scores = await prisma.productivityScore.findMany({
    where: { userId, date: { gte: since } },
    select: { [prismaField]: true },
  });
  
  const values = scores.map(s => Number((s as any)[prismaField]) || 0).sort((a, b) => a - b);
  
  if (values.length === 0) {
    return { field, buckets: [], outlierCount: 0, iqr: 0, q1: 0, q3: 0 };
  }
  
  const min = values[0];
  const max = values[values.length - 1];
  const range = max - min || 1;
  const bucketSize = range / bucketCount;
  
  const buckets: DistributionBucket[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const bMin = min + i * bucketSize;
    const bMax = i === bucketCount - 1 ? max + 0.01 : min + (i + 1) * bucketSize;
    const count = values.filter(v => v >= bMin && v < bMax).length || (i === bucketCount - 1 ? (values.filter(v => v >= bMin).length) : 0);
    buckets.push({
      range: `${Math.round(bMin)}-${Math.round(bMax - 0.01)}`,
      min: Math.round(bMin),
      max: Math.round(bMax - 0.01),
      count,
      percentage: Math.round((count / values.length) * 1000) / 10,
    });
  }
  
  const q1 = calculatePercentile(values, 25);
  const q3 = calculatePercentile(values, 75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outlierCount = values.filter(v => v < lowerFence || v > upperFence).length;
  
  return { field, buckets, outlierCount, iqr: Math.round(iqr * 100) / 100, q1, q3 };
}

/* ------------------------------------------------------------------ */
/* Data Export                                                         */
/* ------------------------------------------------------------------ */

export type ExportFormat = "csv" | "json";

export async function exportData(userId: string, table: string, format: ExportFormat, days: number = 90): Promise<string> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  let data: Record<string, any>[];
  
  switch (table) {
    case "ProductivityScore":
      data = await prisma.productivityScore.findMany({ where: { userId, date: { gte: since } }, orderBy: { date: "asc" } });
      break;
    case "Task":
      data = await prisma.task.findMany({ where: { userId, createdAt: { gte: since } }, orderBy: { createdAt: "asc" } });
      break;
    case "Note":
      data = await prisma.note.findMany({ where: { userId, createdAt: { gte: since } }, orderBy: { createdAt: "asc" } });
      break;
    case "Goal":
      data = await prisma.goal.findMany({ where: { userId, createdAt: { gte: since } }, orderBy: { createdAt: "asc" } });
      break;
    case "WeeklyReview":
      data = await prisma.weeklyReview.findMany({ where: { userId, weekStartDate: { gte: since } }, orderBy: { weekStartDate: "asc" } });
      break;
    case "Reminder":
      data = await prisma.reminder.findMany({ where: { userId, createdAt: { gte: since } }, orderBy: { createdAt: "asc" } });
      break;
    default:
      throw new Error(`Table '${table}' is not available for export.`);
  }
  
  // Serialize dates
  const serialized = data.map(row => {
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      if (val instanceof Date) clean[key] = val.toISOString();
      else if (typeof val === "object" && val !== null) clean[key] = JSON.stringify(val);
      else clean[key] = val;
    }
    return clean;
  });
  
  if (format === "json") {
    return JSON.stringify(serialized, null, 2);
  }
  
  // CSV
  if (serialized.length === 0) return "";
  const headers = Object.keys(serialized[0]);
  const escape = (v: any) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes("\"") || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = serialized.map(row => headers.map(h => escape(row[h])).join(","));
  return [headers.join(","), ...rows].join("\n");
}

/* ------------------------------------------------------------------ */
/* Learning Resources                                                  */
/* ------------------------------------------------------------------ */

export interface LearningResource {
  id: string;
  title: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  description: string;
  content: string;
  exampleQuery?: string;
}

export const LEARNING_RESOURCES: LearningResource[] = [
  {
    id: "sql-basics-1",
    title: "SELECT Basics",
    category: "SQL Fundamentals",
    difficulty: "beginner",
    description: "Learn the foundation of SQL queries — selecting columns, filtering rows, and sorting results.",
    content: `## SELECT Basics

Every SQL query starts with SELECT. You choose which columns you want:

\r\r\rsql
SELECT score, taskScore, goalScore, date
FROM "ProductivityScore"
ORDER BY date DESC
LIMIT 10
\r\r\r

### Key Concepts
- **SELECT** — choose columns
- **FROM** — which table to read
- **WHERE** — filter rows (e.g., score > 50)
- **ORDER BY** — sort results
- **LIMIT** — restrict row count

### Try It
Click "Run" on the example query to see your last 10 productivity scores!`,
    exampleQuery: 'SELECT score, taskScore, goalScore, date FROM "ProductivityScore" ORDER BY date DESC LIMIT 10',
  },
  {
    id: "sql-aggregates",
    title: "Aggregate Functions",
    category: "SQL Fundamentals",
    difficulty: "beginner",
    description: "COUNT, SUM, AVG, MIN, MAX — the building blocks of data analysis.",
    content: `## Aggregate Functions

Aggregates compute a single value from many rows:

\r\r\rsql
SELECT 
  COUNT(*) as total_days,
  ROUND(AVG(score), 1) as avg_score,
  MIN(score) as worst_day,
  MAX(score) as best_day,
  SUM(tasksCompleted) as total_completed
FROM "ProductivityScore"
\r\r\r

### Common Aggregates
| Function | Purpose |
|----------|--------|
| COUNT(*) | Total rows |
| AVG(col) | Average value |
| SUM(col) | Total sum |
| MIN/MAX | Range boundaries |`,
    exampleQuery: 'SELECT COUNT(*) as total_days, ROUND(AVG(score), 1) as avg_score, MIN(score) as worst_day, MAX(score) as best_day, SUM(tasksCompleted) as total_completed FROM "ProductivityScore"',
  },
  {
    id: "sql-group-by",
    title: "GROUP BY Analysis",
    category: "SQL Fundamentals",
    difficulty: "intermediate",
    description: "Group data by categories to find patterns — essential for analytics.",
    content: `## GROUP BY

GROUP BY lets you aggregate data by categories:

\r\r\rsql
SELECT 
  status,
  COUNT(*) as task_count,
  ROUND(AVG(priority), 1) as avg_priority
FROM "Task"
GROUP BY status
ORDER BY task_count DESC
\r\r\r

### Rules
- Every column in SELECT must be in GROUP BY or wrapped in an aggregate
- HAVING filters groups (WHERE filters rows)
- Combine with ORDER BY for ranking`,
    exampleQuery: 'SELECT status, COUNT(*) as task_count FROM "Task" GROUP BY status ORDER BY task_count DESC',
  },
  {
    id: "sql-joins",
    title: "JOINs Explained",
    category: "SQL Fundamentals",
    difficulty: "intermediate",
    description: "Combine data from multiple tables using INNER JOIN, LEFT JOIN, and more.",
    content: `## JOINs

JOINs combine rows from two tables based on a related column:

\r\r\rsql
SELECT 
  t.title, t.status, t.priority,
  g.name as goal_name, g.progress as goal_progress
FROM "Task" t
LEFT JOIN "Goal" g ON t."goalId" = g.id
WHERE t.status = 'Completed'
ORDER BY t."completedAt" DESC
LIMIT 20
\r\r\r

### Types
- **INNER JOIN** — only matching rows
- **LEFT JOIN** — all rows from left + matches from right
- **RIGHT JOIN** — opposite of LEFT`,
    exampleQuery: 'SELECT t.title, t.status, t.priority, g.name as goal_name FROM "Task" t LEFT JOIN "Goal" g ON t."goalId" = g.id WHERE t.status = \'Completed\' LIMIT 15',
  },
  {
    id: "stats-descriptive",
    title: "Descriptive Statistics",
    category: "Statistics",
    difficulty: "beginner",
    description: "Mean, median, mode, standard deviation — the vocabulary of data.",
    content: `## Descriptive Statistics

These summarize your data in a few numbers:

| Statistic | What It Tells You |
|-----------|------------------|
| **Mean** | Average value (sensitive to outliers) |
| **Median** | Middle value (robust to outliers) |
| **Mode** | Most frequent value |
| **Std Dev** | How spread out data is |
| **Percentiles** | What value X% of data falls below |

### Example
If your avg score is 65 but median is 72, your data is **left-skewed** — a few bad days pull the average down. The median (72) better represents your typical day!`,
  },
  {
    id: "stats-correlation",
    title: "Correlation & Causation",
    category: "Statistics",
    difficulty: "intermediate",
    description: "Understand Pearson correlation — does one variable predict another?",
    content: `## Correlation Analysis

Pearson's r measures linear relationship between two variables:

| |r| Range | Interpretation |
|----------|---------------|
| 0.0 - 0.2 | No relationship |
| 0.2 - 0.4 | Weak |
| 0.4 - 0.6 | Moderate |
| 0.6 - 0.8 | Strong |
| 0.8 - 1.0 | Very strong |

### Key Rule
**Correlation ≠ Causation!** Just because tasks completed and score are correlated doesn't mean one causes the other. Look for confounding variables.

Use the Correlation Panel on this page to explore your own data!`,
  },
  {
    id: "stats-distributions",
    title: "Distribution Shapes",
    category: "Statistics",
    difficulty: "intermediate",
    description: "Normal, skewed, bimodal — recognize patterns in your data.",
    content: `## Distribution Shapes

### Normal (Bell Curve)
Mean ≈ Median, symmetric. Most data clusters around center.

### Right-Skewed (Positive)
Mean > Median. A few high values stretch the right tail. Common in income, task counts.

### Left-Skewed (Negative)
Mean < Median. A few low values stretch the left tail.

### Bimodal
Two peaks — suggests two distinct groups in your data.

### Outliers
Values beyond 1.5×IQR from Q1/Q3. The Distribution Chart shows these in red!`,
  },
  {
    id: "analytics-productivity",
    title: "Productivity Analytics Patterns",
    category: "Applied Analytics",
    difficulty: "advanced",
    description: "Real-world patterns: circadian rhythms, weekly cycles, and productivity decay.",
    content: `## Real-World Productivity Patterns

### Circadian Rhythm
Most people peak between 9-11 AM and 3-5 PM. Check your hourly task completion!

### Weekly Patterns
Mondays often have low output (ramp-up). Wednesdays peak. Fridays decline.

### The 80/20 Rule
~20% of your tasks likely produce 80% of your progress. Use the SQL playground to find which priority/status combos drive your best scores.

### Parkinson's Law
Tasks expand to fill time. Compare tasks with vs. without due dates — do deadlines boost completion?`,
    exampleQuery: 'SELECT EXTRACT(DOW FROM "createdAt") as day_of_week, COUNT(*) as tasks_created, SUM(CASE WHEN status = \'Completed\' THEN 1 ELSE 0 END) as tasks_completed FROM "Task" GROUP BY EXTRACT(DOW FROM "createdAt") ORDER BY day_of_week',
  },
];
