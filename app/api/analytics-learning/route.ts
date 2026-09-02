import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedUserId } from "@/lib/auth-helpers";
import {
  executeSafeQuery,
  getProductivityStats,
  getCorrelations,
  getDistribution,
  exportData,
  getTableInfo,
  LEARNING_RESOURCES,
} from "@/lib/services/analytics-learning.service";
import type { ExportFormat } from "@/lib/services/analytics-learning.service";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "";

    switch (view) {
      case "stats": {
        const days = parseInt(searchParams.get("days") || "30");
        const stats = await getProductivityStats(userId, days);
        return NextResponse.json({ stats });
      }

      case "correlations": {
        const days = parseInt(searchParams.get("days") || "30");
        const correlations = await getCorrelations(userId, days);
        return NextResponse.json({ correlations });
      }

      case "distribution": {
        const field = searchParams.get("field") || "score";
        const days = parseInt(searchParams.get("days") || "30");
        const buckets = parseInt(searchParams.get("buckets") || "10");
        const dist = await getDistribution(userId, field, days, buckets);
        return NextResponse.json(dist);
      }

      case "export": {
        const table = searchParams.get("table") || "ProductivityScore";
        const format = (searchParams.get("format") || "csv") as ExportFormat;
        const days = parseInt(searchParams.get("days") || "90");
        const content = await exportData(userId, table, format, days);
        const filename = `${table.toLowerCase()}_${days}d.${format}`;
        if (format === "json") {
          return new NextResponse(content, {
            headers: {
              "Content-Type": "application/json",
              "Content-Disposition": `attachment; filename="${filename}"`,
            },
          });
        }
        return new NextResponse(content, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }

      case "table-info": {
        return NextResponse.json({ tables: getTableInfo() });
      }

      case "resources": {
        return NextResponse.json({ resources: LEARNING_RESOURCES });
      }

      default:
        return NextResponse.json({ error: "Unknown view. Use: stats|correlations|distribution|export|table-info|resources" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { sql } = body;

    if (!sql || typeof sql !== "string") {
      return NextResponse.json({ error: "SQL query is required" }, { status: 400 });
    }

    if (sql.length > 2000) {
      return NextResponse.json({ error: "Query too long (max 2000 chars)" }, { status: 400 });
    }

    const result = await executeSafeQuery(sql, userId);
    return NextResponse.json({ result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Query execution failed" }, { status: 400 });
  }
}
