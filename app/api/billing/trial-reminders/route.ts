import { NextResponse } from "next/server";
import { sendTrialReminders } from "@/server/billing/trial-reminders";
import { getTrialReminderEmailConfig } from "@/server/email/trial-ending-email";

export const maxDuration = 60;

/**
 * Endpoint cron harian pengingat masa trial (dipanggil Vercel Cron).
 * Dilindungi CRON_SECRET: Vercel mengirim header `Authorization: Bearer <CRON_SECRET>`
 * secara otomatis bila variabel tersebut diset di project.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json({ message: "CRON_SECRET belum dikonfigurasi." }, { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: "Tidak diizinkan." }, { status: 401 });
  }

  if (!getTrialReminderEmailConfig()) {
    return NextResponse.json({ message: "Konfigurasi email belum lengkap." }, { status: 503 });
  }

  try {
    const result = await sendTrialReminders();
    if (result.failed > 0) {
      console.error("Trial reminder cron finished with failures", {
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        failures: result.failures,
      });
    } else {
      console.info("Trial reminder cron finished", {
        sent: result.sent,
        skipped: result.skipped,
        messageIds: result.messages.map((item) => item.messageId).filter(Boolean),
      });
    }
    return NextResponse.json({ ok: result.failed === 0, ...result }, {
      status: result.failed > 0 ? 502 : 200,
    });
  } catch (error) {
    console.error("Trial reminder cron crashed", {
      reason: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    return NextResponse.json({ message: "Pengingat trial gagal diproses." }, { status: 500 });
  }
}
