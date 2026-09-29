type TrialEndingEmailInput = {
  recipient: string;
  recipientName?: string | null;
  businessName: string;
  trialEndsAt: Date;
  /** Tautan absolut ke halaman langganan; null bila NEXT_PUBLIC_SITE_URL tidak tersedia. */
  upgradeUrl: string | null;
  idempotencyKey?: string;
};

type TrialReminderEmailConfig = {
  apiKey: string;
  from: string;
};

type SendTrialEndingEmailOptions = {
  config?: TrialReminderEmailConfig;
  fetcher?: typeof fetch;
  now?: Date;
};

const JAKARTA_TIME_ZONE = "Asia/Jakarta";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

export function getTrialReminderEmailConfig(
  environment: Record<string, string | undefined> = process.env,
): TrialReminderEmailConfig | null {
  const apiKey = environment.RESEND_API_KEY?.trim();
  const from = environment.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) return null;

  return { apiKey, from };
}

export function getUpgradeUrl(
  environment: Record<string, string | undefined> = process.env,
): string | null {
  const siteUrl = environment.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return siteUrl ? `${siteUrl}/subscription` : null;
}

function formatTrialEndDate(trialEndsAt: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: JAKARTA_TIME_ZONE,
  }).format(trialEndsAt);
}

function formatTrialEndTime(trialEndsAt: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: JAKARTA_TIME_ZONE,
  }).format(trialEndsAt);
}

/** Nomor hari kalender versi WIB (Asia/Jakarta tidak memakai DST). */
function jakartaDayNumber(date: Date): number {
  return Math.floor((date.getTime() + 7 * 3_600_000) / 86_400_000);
}

export function getTrialReminderSubject(trialEndsAt: Date, now = new Date()): string {
  const daysLeft = jakartaDayNumber(trialEndsAt) - jakartaDayNumber(now);
  if (daysLeft <= 0) return "Trial wazePOS berakhir hari ini — aktifkan paketmu";
  return daysLeft === 1
    ? "Trial wazePOS berakhir besok — aktifkan paketmu"
    : `Trial wazePOS berakhir dalam ${daysLeft} hari`;
}

export async function sendTrialEndingEmail(
  { recipient, recipientName, businessName, trialEndsAt, upgradeUrl, idempotencyKey }: TrialEndingEmailInput,
  options: SendTrialEndingEmailOptions = {},
) {
  const config = options.config ?? getTrialReminderEmailConfig();
  if (!config) {
    throw new Error("Konfigurasi email pengingat trial belum lengkap.");
  }

  const now = options.now ?? new Date();
  const safeName = escapeHtml(recipientName?.trim() || "Pengguna wazePOS");
  const safeBusinessName = escapeHtml(businessName.trim() || "Bisnis Anda");
  const safeDate = escapeHtml(formatTrialEndDate(trialEndsAt));
  const safeTime = escapeHtml(formatTrialEndTime(trialEndsAt));
  const safeUpgradeUrl = upgradeUrl ? escapeHtml(upgradeUrl) : null;
  const ctaHtml = safeUpgradeUrl
    ? `<p>
        <a href="${safeUpgradeUrl}" style="display:inline-block;border-radius:10px;background:#198760;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700">
          Aktifkan Paket Sekarang
        </a>
      </p>`
    : "";
  const ctaText = upgradeUrl
    ? `Aktifkan paket di: ${upgradeUrl}`
    : "Aktifkan paket melalui halaman Langganan di aplikasi wazePOS.";

  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: config.from,
      to: [recipient],
      // Payload harus stabil ketika permintaan yang sama dicoba ulang oleh cron.
      subject: idempotencyKey
        ? "Trial wazePOS tersisa maksimal 1 hari — aktifkan paketmu"
        : getTrialReminderSubject(trialEndsAt, now),
      text: [
        `Halo ${recipientName?.trim() || "Pengguna wazePOS"},`,
        "",
        `Masa trial untuk ${businessName.trim() || "bisnis Anda"} akan berakhir pada ${formatTrialEndDate(trialEndsAt)} pukul ${formatTrialEndTime(trialEndsAt)} WIB.`,
        "Setelah trial berakhir, akses fitur aplikasi akan terkunci sampai paket diaktifkan.",
        ctaText,
        "",
        "Tim wazePOS",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#15211d;max-width:560px;margin:0 auto">
          <p>Halo ${safeName},</p>
          <p>Masa trial untuk <strong>${safeBusinessName}</strong> akan berakhir pada:</p>
          <p style="font-size:15px"><strong>${safeDate}</strong> pukul <strong>${safeTime} WIB</strong></p>
          <p>Setelah trial berakhir, akses fitur aplikasi akan terkunci sampai paket diaktifkan. Data transaksi dan stok Anda tetap aman.</p>
          ${ctaHtml}
          <p style="font-size:13px;color:#627069">Email ini dikirim otomatis; Anda hanya menerimanya satu kali per masa trial.</p>
          <p style="font-size:13px;color:#627069">Tim wazePOS</p>
        </div>
      `.trim(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Pengiriman email pengingat trial gagal dengan status ${response.status}.`);
  }
}
