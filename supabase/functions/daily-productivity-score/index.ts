// Supabase Edge Function: daily-productivity-score
// Deploy with: supabase functions deploy daily-productivity-score
// Set secret: supabase secrets set CRON_SECRET=your_secret APP_URL=https://your-domain.com
//
// This replaces the Vercel cron job with a Supabase Edge Function
// that can be triggered by Supabase's pg_cron or external cron services.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const APP_URL = Deno.env.get("APP_URL") || "http://localhost:3000";

Deno.serve(async (req: Request) => {
  // Verify authorization
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Call the Next.js API route that does the actual scoring
    const response = await fetch(`${APP_URL}/api/cron/daily-score`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CRON_SECRET}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
