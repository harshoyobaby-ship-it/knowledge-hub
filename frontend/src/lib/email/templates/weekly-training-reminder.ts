export interface PendingTrainingItem {
  title: string;
  type: string;
  url: string;
}

export interface WeeklyReminderTemplateData {
  firstName: string;
  appName: string;
  appUrl: string;
  overallProgress: number;
  pendingCount: number;
  pendingItems: PendingTrainingItem[];
}

const TYPE_LABELS: Record<string, string> = {
  CHAPTER: "Learning Module",
  SOP: "SOP",
  QUIZ: "Mock Test",
  LESSON: "Course Lesson",
  COURSE: "Course",
};

export function buildWeeklyTrainingReminderEmail(data: WeeklyReminderTemplateData) {
  const subject = `Weekly reminder: ${data.pendingCount} training module${data.pendingCount === 1 ? "" : "s"} to complete`;

  const itemsHtml = data.pendingItems
    .slice(0, 8)
    .map(
      (item) =>
        `<li style="margin-bottom:8px;"><a href="${item.url}" style="color:#2563eb;text-decoration:none;">${item.title}</a> <span style="color:#6b7280;font-size:13px;">(${TYPE_LABELS[item.type] ?? item.type})</span></li>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111827;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;margin-bottom:8px;">Hi ${data.firstName},</h1>
  <p>This is your weekly training reminder from <strong>${data.appName}</strong>.</p>
  <p>You have <strong>${data.pendingCount}</strong> training item${data.pendingCount === 1 ? "" : "s"} still to complete. Your overall progress is <strong>${data.overallProgress}%</strong>.</p>
  ${data.pendingItems.length > 0 ? `
  <h2 style="font-size:16px;margin-top:24px;">Continue learning</h2>
  <ul style="padding-left:20px;">${itemsHtml}</ul>
  ` : ""}
  <p style="margin-top:28px;">
    <a href="${data.appUrl}/dashboard" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Dashboard</a>
  </p>
  <p style="margin-top:32px;font-size:13px;color:#6b7280;">You receive this email every week while you have incomplete training assigned to your department.</p>
</body>
</html>`;

  const itemsText = data.pendingItems
    .slice(0, 8)
    .map((item) => `- ${item.title} (${TYPE_LABELS[item.type] ?? item.type}): ${item.url}`)
    .join("\n");

  const text = `Hi ${data.firstName},

This is your weekly training reminder from ${data.appName}.

You have ${data.pendingCount} training item(s) still to complete. Overall progress: ${data.overallProgress}%.

${itemsText ? `Continue learning:\n${itemsText}\n\n` : ""}Dashboard: ${data.appUrl}/dashboard

You receive this email every week while you have incomplete training.`;

  return { subject, html, text };
}
