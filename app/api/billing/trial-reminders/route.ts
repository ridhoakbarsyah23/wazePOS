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
    return NextResponse.json({ ok: result.failed === 0, ...result }, {
      status: result.failed > 0 ? 502 : 200,
    });
  } catch {
    return NextResponse.json({ message: "Pengingat trial gagal diproses." }, { status: 500 });
  }
}
