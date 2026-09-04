// Supabase Edge Function: send-whatsapp-digest
// Deploy with: supabase functions deploy send-whatsapp-digest
// Sends daily WhatsApp digest to users who opted in

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const APP_URL = Deno.env.get("APP_URL") || "http://localhost:3000";

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  try {
    const response = await fetch(`${APP_URL}/api/cron/daily-digest`, {
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
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
