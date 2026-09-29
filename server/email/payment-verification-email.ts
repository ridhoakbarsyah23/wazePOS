import { plans } from "@/shared/billing/plans";

export type PaymentVerificationDecision = "approve" | "reject";

type PaymentVerificationEmailInput = {
  recipient: string;
  recipientName?: string | null;
  businessName: string;
  plan: "tumbuh" | "bisnis";
  amount: number;
  orderId: string;
  decision: PaymentVerificationDecision;
  verificationNote?: string | null;
  /** Tautan absolut ke halaman langganan; null bila NEXT_PUBLIC_SITE_URL tidak tersedia. */
  subscriptionUrl: string | null;
  idempotencyKey?: string;
};

type PaymentVerificationEmailConfig = {
  apiKey: string;
  from: string;
};

type SendPaymentVerificationEmailOptions = {
  config?: PaymentVerificationEmailConfig;
  fetcher?: typeof fetch;
};

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

export function getPaymentVerificationEmailConfig(
  environment: Record<string, string | undefined> = process.env,
): PaymentVerificationEmailConfig | null {
  const apiKey = environment.RESEND_API_KEY?.trim();
  const from = environment.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) return null;

  return { apiKey, from };
}

export function getPaymentVerificationSubject(decision: PaymentVerificationDecision): string {
  return decision === "approve"
    ? "Pembayaran wazePOS disetujui — paketmu aktif"
    : "Pembayaran wazePOS ditolak — periksa kembali";
}

export function getSubscriptionUrl(
  environment: Record<string, string | undefined> = process.env,
): string | null {
  const siteUrl = environment.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return siteUrl ? `${siteUrl}/subscription` : null;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function sendPaymentVerificationEmail(
  {
    recipient,
    recipientName,
    businessName,
    plan,
    amount,
    orderId,
    decision,
    verificationNote,
    subscriptionUrl,
    idempotencyKey,
  }: PaymentVerificationEmailInput,
  options: SendPaymentVerificationEmailOptions = {},
) {
  const config = options.config ?? getPaymentVerificationEmailConfig();
  if (!config) {
    throw new Error("Konfigurasi email verifikasi pembayaran belum lengkap.");
  }

  const planName = plans[plan]?.name ?? plan;
  const safeName = escapeHtml(recipientName?.trim() || "Pengguna wazePOS");
  const safeBusinessName = escapeHtml(businessName.trim() || "Bisnis Anda");
  const safePlanName = escapeHtml(planName);
  const safeOrderId = escapeHtml(orderId);
  const safeAmount = escapeHtml(formatRupiah(amount));
  const note = verificationNote?.trim() || "";
  const safeNote = note ? escapeHtml(note) : "";
  const safeSubscriptionUrl = subscriptionUrl ? escapeHtml(subscriptionUrl) : null;

  const headline =
    decision === "approve"
      ? `Pembayaran untuk <strong>${safeBusinessName}</strong> telah <strong>disetujui</strong>. Paket <strong>${safePlanName}</strong> kini aktif selama 1 tahun.`
      : `Pembayaran untuk <strong>${safeBusinessName}</strong> <strong>belum dapat disetujui</strong>. Silakan periksa kembali detail di bawah ini.`;

  const noteHtml =
    decision === "reject" && safeNote
      ? `<p>Alasan penolakan: <strong>${safeNote}</strong></p>`
      : decision === "approve" && safeNote
        ? `<p>Catatan admin: ${safeNote}</p>`
        : "";

  const ctaHtml = safeSubscriptionUrl
    ? `<p>
        <a href="${safeSubscriptionUrl}" style="display:inline-block;border-radius:10px;background:#198760;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700">
          Lihat Langganan
        </a>
      </p>`
    : "";
  const ctaText = subscriptionUrl
    ? `Lihat status langganan di: ${subscriptionUrl}`
    : "Lihat status langganan melalui halaman Langganan di aplikasi wazePOS.";

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
      subject: getPaymentVerificationSubject(decision),
      text: [
        `Halo ${recipientName?.trim() || "Pengguna wazePOS"},`,
        "",
        decision === "approve"
          ? `Pembayaran paket ${planName} untuk ${businessName.trim() || "bisnis Anda"} sebesar ${formatRupiah(amount)} (order ${orderId}) telah disetujui. Paket kini aktif selama 1 tahun.`
          : `Pembayaran paket ${planName} untuk ${businessName.trim() || "bisnis Anda"} sebesar ${formatRupiah(amount)} (order ${orderId}) belum dapat disetujui.${note ? ` Alasan: ${note}` : ""}`,
        ctaText,
        "",
        "Tim wazePOS",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#15211d;max-width:560px;margin:0 auto">
          <p>Halo ${safeName},</p>
          <p>${headline}</p>
          <p style="font-size:14px">Order <strong>${safeOrderId}</strong> · ${safeAmount}</p>
          ${noteHtml}
          ${ctaHtml}
          <p style="font-size:13px;color:#627069">Tim wazePOS</p>
        </div>
      `.trim(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Pengiriman email verifikasi pembayaran gagal dengan status ${response.status}.`);
  }
}
