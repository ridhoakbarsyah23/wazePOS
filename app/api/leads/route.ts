import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/server/rate-limit";

export const runtime = "nodejs";

type LeadPayload = {
  name?: unknown;
  whatsapp?: unknown;
  businessName?: unknown;
  businessType?: unknown;
  outlets?: unknown;
  message?: unknown;
  website?: unknown;
};

const asText = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const validPhone = (value: string) => /^[+]?\d[\d\s-]{7,18}$/.test(value);

export async function POST(request: Request) {
  // Form publik: batasi 5 kiriman per IP per 10 menit (di luar honeypot).
  const rate = checkRateLimit({ key: `leads:${getClientIp(request)}`, limit: 5, windowSeconds: 600 });
  if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds);

  let body: LeadPayload;

  try {
    body = (await request.json()) as LeadPayload;
  } catch {
    return NextResponse.json({ message: "Format data tidak valid." }, { status: 400 });
  }

  // Honeypot: silently accept automated submissions without storing them.
  if (asText(body.website, 200)) {
    return NextResponse.json({ message: "Terima kasih. Data Anda telah diterima." });
  }

  const lead = {
    id: crypto.randomUUID(),
    name: asText(body.name, 80),
    whatsapp: asText(body.whatsapp, 24),
    businessName: asText(body.businessName, 100),
    businessType: asText(body.businessType, 50),
    outlets: asText(body.outlets, 20),
    message: asText(body.message, 500),
    createdAt: new Date().toISOString(),
  };

  if (!lead.name || !validPhone(lead.whatsapp) || !lead.businessName || !lead.businessType || !lead.outlets) {
    return NextResponse.json(
      { message: "Lengkapi nama, nomor WhatsApp, nama bisnis, jenis bisnis, dan jumlah gerai dengan benar." },
      { status: 422 },
    );
  }

  const webhookUrl = process.env.LEAD_WEBHOOK_URL?.trim();

  try {
    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.LEAD_WEBHOOK_SECRET
            ? { Authorization: `Bearer ${process.env.LEAD_WEBHOOK_SECRET}` }
            : {}),
        },
        body: JSON.stringify(lead),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
    } else if (process.env.NODE_ENV !== "production") {
      const dataDirectory = path.join(process.cwd(), "data");
      await mkdir(dataDirectory, { recursive: true });
      await appendFile(path.join(dataDirectory, "leads.ndjson"), `${JSON.stringify(lead)}\n`, "utf8");
    } else {
      return NextResponse.json(
        { message: "Formulir belum terhubung. Silakan hubungi kami melalui WhatsApp." },
        { status: 503 },
      );
    }
  } catch (error) {
    console.error("Failed to store lead", error);
    return NextResponse.json(
      { message: "Data belum berhasil dikirim. Silakan coba kembali atau hubungi kami melalui WhatsApp." },
      { status: 502 },
    );
  }

  return NextResponse.json({ message: "Terima kasih. Tim wazePOS akan menghubungi Anda melalui WhatsApp." });
}
