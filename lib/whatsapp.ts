/**
 * WhatsApp Business Platform / Cloud API Integration Client
 * Meta Graph API v21.0
 */

export interface WhatsAppTextMessagePayload {
  to: string;
  text: string;
  previewUrl?: boolean;
}

export interface WhatsAppTemplateMessagePayload {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: any[];
}

export interface WhatsAppApiResponse {
  messaging_product: string;
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string }>;
  error?: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

const GRAPH_API_BASE = "https://graph.facebook.com";

/**
 * Format phone numbers to standard E.164 without leading '+' or special chars
 * E.g., "+91 7486007596" -> "917486007596", "7486007596" -> "917486007596"
 */
export function formatWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith("0")) {
    cleaned = `91${cleaned.slice(1)}`;
  }
  return cleaned;
}

/**
 * Get configured WhatsApp credentials from environment
 */
export function getWhatsAppConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";
  const webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "smart_notes_verify_token_2026";
  const wabaId = process.env.WHATSAPP_WABA_ID || "";

  return {
    phoneNumberId,
    accessToken,
    apiVersion,
    webhookVerifyToken,
    wabaId,
    isConfigured: Boolean(phoneNumberId && accessToken),
  };
}

/**
 * Core function to send requests to Meta Graph API
 */
async function sendWhatsAppRequest(endpoint: string, payload: any): Promise<WhatsAppApiResponse> {
  const { phoneNumberId, accessToken, apiVersion } = getWhatsAppConfig();

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      "WhatsApp credentials missing. Please set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env"
    );
  }

  const url = `${GRAPH_API_BASE}/${apiVersion}/${phoneNumberId}/${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error("WhatsApp API Error Response:", data.error || data);
    throw new Error(
      data.error?.message || `WhatsApp API error: ${response.status} ${response.statusText}`
    );
  }

  return data;
}

/**
 * Send plain text message
 */
export async function sendWhatsAppTextMessage({
  to,
  text,
  previewUrl = false,
}: WhatsAppTextMessagePayload): Promise<WhatsAppApiResponse> {
  // Caller should format the number before passing; do NOT double-format here
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: previewUrl,
      body: text,
    },
  };

  return sendWhatsAppRequest("messages", payload);
}

/**
 * Send template message (required for initial contact outside the 24-hour service window)
 * E.g., "hello_world" or registered reminder templates
 */
export async function sendWhatsAppTemplateMessage({
  to,
  templateName,
  languageCode = "en_US",
  components = [],
}: WhatsAppTemplateMessagePayload): Promise<WhatsAppApiResponse> {
  // Caller should format the number before passing; do NOT double-format here

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      ...(components.length > 0 ? { components } : {}),
    },
  };

  return sendWhatsAppRequest("messages", payload);
}

/**
 * Send rich task reminder message
 */
export async function sendWhatsAppTaskReminder(
  to: string,
  task: {
    title: string;
    dueDate?: string | Date | null;
    dueTime?: string | null;
    priority?: string;
    projectName?: string | null;
    goalName?: string | null;
  }
): Promise<WhatsAppApiResponse> {
  const priorityEmoji =
    task.priority === "Urgent"
      ? "🔴"
      : task.priority === "High"
      ? "🟠"
      : task.priority === "Low"
      ? "🟢"
      : "🟡";

  let dateStr = "";
  if (task.dueDate) {
    const d = new Date(task.dueDate);
    dateStr = d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  const timeStr = task.dueTime ? `at ${task.dueTime}` : "";
  const scheduleLine = dateStr || timeStr ? `📅 *Due:* ${dateStr} ${timeStr}\n` : "";
  const projectLine = task.projectName ? `💼 *Project:* ${task.projectName}\n` : "";
  const goalLine = task.goalName ? `🎯 *Goal:* ${task.goalName}\n` : "";

  const text =
    `⏰ *Task Reminder*\n\n` +
    `*${task.title}*\n\n` +
    `${priorityEmoji} *Priority:* ${task.priority || "Medium"}\n` +
    scheduleLine +
    projectLine +
    goalLine +
    `\nStay focused and make progress today! 🚀\n_Smart Notes & Reminder_`;

  return sendWhatsAppTextMessage({ to, text });
}

/**
 * Send daily morning/evening digest of tasks
 */
export async function sendWhatsAppDailyDigest(
  to: string,
  userName: string,
  tasks: Array<{ title: string; priority?: string; status?: string }>,
  goalsCount: number
): Promise<WhatsAppApiResponse> {
  const formattedTasks =
    tasks.length > 0
      ? tasks
          .slice(0, 7)
          .map((t, idx) => `${idx + 1}. ${t.status === "Completed" ? "✅" : "▫️"} ${t.title}`)
          .join("\n")
      : "🎉 No pending tasks for today! Great job.";

  const text =
    `🌅 *Good Day, ${userName || "there"}!*\n\n` +
    `Here is your daily snapshot from *Smart Notes & Reminder*:\n\n` +
    `📋 *Today's Focus Tasks (${tasks.length}):*\n${formattedTasks}\n\n` +
    (goalsCount > 0 ? `🎯 *Active Goals:* ${goalsCount} in progress\n\n` : "") +
    `Have a productive and impactful day! 💪`;

  return sendWhatsAppTextMessage({ to, text });
}
