type OtpEmailInput = {
  recipient: string;
  recipientName?: string | null;
  otp: string;
  /** Durasi berlaku kode dalam menit (untuk teks email). */
  expiresInMinutes: number;
};

type OtpEmailConfig = {
  apiKey: string;
  from: string;
};

type SendOtpEmailOptions = {
  config?: OtpEmailConfig;
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

export function getOtpEmailConfig(
  environment: Record<string, string | undefined> = process.env,
): OtpEmailConfig | null {
  const apiKey = environment.RESEND_API_KEY?.trim();
  const from = environment.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) return null;

  return { apiKey, from };
}

export async function sendVerificationOtpEmail(
  { recipient, recipientName, otp, expiresInMinutes }: OtpEmailInput,
  options: SendOtpEmailOptions = {},
) {
  const config = options.config ?? getOtpEmailConfig();
  if (!config) {
    throw new Error("Konfigurasi email kode verifikasi belum lengkap.");
  }

  const safeName = escapeHtml(recipientName?.trim() || "Pengguna wazePOS");
  const safeOtp = escapeHtml(otp.trim());

  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [recipient],
      subject: "Kode verifikasi akun wazePOS",
      text: [
        `Halo ${recipientName?.trim() || "Pengguna wazePOS"},`,
        "",
        `Kode verifikasi akun wazePOS Anda: ${otp.trim()}`,
        `Kode berlaku selama ${expiresInMinutes} menit dan hanya dapat digunakan beberapa kali.`,
        "Jika Anda tidak merasa mendaftar, abaikan email ini.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#15211d;max-width:560px;margin:0 auto">
          <p>Halo ${safeName},</p>
          <p>Masukkan kode berikut untuk memverifikasi email akun wazePOS Anda:</p>
          <p style="font-size:32px;font-weight:800;letter-spacing:8px;color:#106348">${safeOtp}</p>
          <p style="font-size:13px;color:#627069">Kode berlaku selama ${expiresInMinutes} menit. Jika Anda tidak merasa mendaftar, abaikan email ini.</p>
          <p style="font-size:13px;color:#627069">Tim wazePOS</p>
        </div>
      `.trim(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Pengiriman email kode verifikasi gagal dengan status ${response.status}.`);
  }
}
