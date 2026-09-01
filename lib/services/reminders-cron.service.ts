import { prisma } from "@/lib/prisma";
import { formatWhatsAppNumber, sendWhatsAppTaskReminder, sendWhatsAppTextMessage } from "@/lib/whatsapp";
import { getTodayTasks } from "@/lib/services/tasks.service";
import { getActiveGoals } from "@/lib/services/goals.service";

/**
 * Process all due tasks and send real-time WhatsApp reminder alerts
 */
export async function processDueTaskReminders(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  details: any[];
}> {
  const now = new Date();
  const details: any[] = [];
  let sentCount = 0;
  let failedCount = 0;

  // 1. Fetch uncompleted, unnotified tasks for users who have WhatsApp notifications enabled
  const dueTasks = await prisma.task.findMany({
    where: {
      status: { notIn: ["Completed", "Cancelled"] },
      isNotified: false,
      dueDate: { not: null },
      user: {
        whatsappVerified: true,
        whatsappNotifications: true,
        whatsappNumber: { not: null },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          whatsappNumber: true,
          timezone: true,
        },
      },
      project: {
        select: { name: true },
      },
      goal: {
        select: { name: true },
      },
    },
    take: 50,
  });

  for (const task of dueTasks) {
    const user = task.user;
    if (!user.whatsappNumber) continue;

    // Check if task is due right now
    const taskDueDate = new Date(task.dueDate!);
    let isDue = false;

    if (task.dueTime) {
      // Parse HH:mm
      const [hours, minutes] = task.dueTime.split(":").map(Number);
      const scheduledTime = new Date(taskDueDate);
      scheduledTime.setHours(hours, minutes || 0, 0, 0);

      // Task is due if scheduled time is on or before current time
      if (now >= scheduledTime) {
        isDue = true;
      }
    } else {
      // If no specific time, compare dates (due today or in past)
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      if (taskDueDate <= todayDate) {
        isDue = true;
      }
    }

    if (!isDue) {
      continue;
    }

    const cleanPhone = formatWhatsAppNumber(user.whatsappNumber);

    try {
      // Send formatted WhatsApp reminder
      const res = await sendWhatsAppTaskReminder(cleanPhone, {
        title: task.title,
        dueDate: task.dueDate!,
        dueTime: task.dueTime,
        priority: task.priority as any,
        projectName: task.project?.name,
        goalName: task.goal?.name,
      });

      // Mark task as notified
      await prisma.task.update({
        where: { id: task.id },
        data: {
          isNotified: true,
          notifiedAt: new Date(),
        },
      });

      sentCount++;
      details.push({
        taskId: task.id,
        title: task.title,
        user: user.name,
        phone: cleanPhone,
        status: "SENT",
        response: res,
      });
    } catch (err: any) {
      failedCount++;
      details.push({
        taskId: task.id,
        title: task.title,
        user: user.name,
        phone: cleanPhone,
        status: "FAILED",
        error: err.message,
      });
    }
  }

  return {
    processed: dueTasks.length,
    sent: sentCount,
    failed: failedCount,
    details,
  };
}

/**
 * Process and dispatch Morning Daily Focus Digest to all subscribed users
 */
export async function processDailyFocusDigests(): Promise<{
  totalEligible: number;
  digestsSent: number;
  details: any[];
}> {
  const users = await prisma.user.findMany({
    where: {
      whatsappVerified: true,
      whatsappDailyDigest: true,
      whatsappNumber: { not: null },
    },
    select: {
      id: true,
      name: true,
      whatsappNumber: true,
      timezone: true,
    },
  });

  const details: any[] = [];
  let sentCount = 0;

  for (const user of users) {
    if (!user.whatsappNumber) continue;

    try {
      const todayTasks = await getTodayTasks(user.id);
      const activeGoals = await getActiveGoals(user.id);

      const cleanPhone = formatWhatsAppNumber(user.whatsappNumber);
      const userName = user.name || "there";

      let tasksSection = "";
      if (todayTasks.length === 0) {
        tasksSection = "✨ _No tasks scheduled for today. You're all clear!_";
      } else {
        tasksSection = todayTasks
          .slice(0, 5)
          .map((t, idx) => {
            const prioEmoji = t.priority === "Urgent" ? "🔴" : t.priority === "High" ? "🟠" : "🟡";
            const timeStr = t.dueTime ? ` (${t.dueTime})` : "";
            return `${idx + 1}. ${prioEmoji} *${t.title}*${timeStr}`;
          })
          .join("\n");
        if (todayTasks.length > 5) {
          tasksSection += `\n_...and ${todayTasks.length - 5} more tasks in your dashboard._`;
        }
      }

      let goalsSection = "";
      if (activeGoals.length > 0) {
        goalsSection =
          `\n\n🎯 *Active Goals Progress:*\n` +
          activeGoals
            .slice(0, 3)
            .map((g) => `• *${g.name}* — ${Math.round(g.progress)}% complete`)
            .join("\n");
      }

      const digestMessage =
        `🌅 *Good Morning, ${userName}!* ☀️\n\n` +
        `Here is your Daily Focus Agenda for today:\n\n` +
        `📋 *Today's Schedule:*\n` +
        `${tasksSection}` +
        `${goalsSection}\n\n` +
        `Stay focused and make progress today! 🚀\n` +
        `_Smart Notes & Reminder_`;

      const waRes = await sendWhatsAppTextMessage({
        to: cleanPhone,
        text: digestMessage,
      });

      sentCount++;
      details.push({
        userId: user.id,
        name: user.name,
        phone: cleanPhone,
        status: "SENT",
        messageId: waRes.messages?.[0]?.id,
      });
    } catch (err: any) {
      details.push({
        userId: user.id,
        name: user.name,
        status: "FAILED",
        error: err.message,
      });
    }
  }

  return {
    totalEligible: users.length,
    digestsSent: sentCount,
    details,
  };
}
