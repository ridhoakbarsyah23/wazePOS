type PasswordResetEmailInput = {
  recipient: string;
  recipientName?: string | null;
  resetUrl: string;
};

type PasswordResetEmailConfig = {
  apiKey: string;
  from: string;
};

type SendPasswordResetEmailOptions = {
  config?: PasswordResetEmailConfig;
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

export function getPasswordResetEmailConfig(
  environment: Record<string, string | undefined> = process.env,
): PasswordResetEmailConfig | null {
  const apiKey = environment.RESEND_API_KEY?.trim();
  const from = environment.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) return null;

  return { apiKey, from };
}

export async function sendPasswordResetEmail(
  { recipient, recipientName, resetUrl }: PasswordResetEmailInput,
  options: SendPasswordResetEmailOptions = {},
) {
  const config = options.config ?? getPasswordResetEmailConfig();
  if (!config) {
    throw new Error("Konfigurasi email reset kata sandi belum lengkap.");
  }

  const safeName = escapeHtml(recipientName?.trim() || "Pengguna wazePOS");
  const safeResetUrl = escapeHtml(resetUrl);
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [recipient],
      subject: "Atur ulang kata sandi wazePOS",
      text: [
        `Halo ${recipientName?.trim() || "Pengguna wazePOS"},`,
        "",
        "Kami menerima permintaan untuk mengatur ulang kata sandi akun wazePOS Anda.",
        `Buka tautan berikut dalam 60 menit: ${resetUrl}`,
        "",
        "Jika Anda tidak meminta perubahan ini, abaikan email ini.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#15211d;max-width:560px;margin:0 auto">
          <p>Halo ${safeName},</p>
          <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun wazePOS Anda.</p>
          <p>
            <a href="${safeResetUrl}" style="display:inline-block;border-radius:10px;background:#198760;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700">
              Atur Ulang Kata Sandi
            </a>
          </p>
          <p style="font-size:13px;color:#627069">Tautan ini berlaku selama 60 menit dan hanya dapat digunakan satu kali.</p>
          <p style="font-size:13px;color:#627069">Jika Anda tidak meminta perubahan ini, abaikan email ini.</p>
        </div>
      `.trim(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Pengiriman email reset gagal dengan status ${response.status}.`);
  }
}
