import { createHmac, randomUUID } from "node:crypto";
import { expect, type Browser, test } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import postgres from "postgres";

loadEnvConfig(process.cwd());

const baseUrl = process.env.PLAYWRIGHT_BASE_URL;
const remoteBaseUrl = baseUrl
  ? !/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/.*)?$/i.test(baseUrl)
  : false;
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://wazepos:wazepos@127.0.0.1:5434/wazepos";
const authSecret = process.env.BETTER_AUTH_SECRET ?? "e2e-only-secret-with-at-least-32-characters";

const proofImage = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

type SubscriptionSeed = {
  userId: string;
  businessId: string;
  subscriptionId: string;
  sessionToken: string;
  userName: string;
  businessName: string;
};

function signCookieValue(value: string) {
  const signature = createHmac("sha256", authSecret).update(value).digest("base64");
  return encodeURIComponent(`${value}.${signature}`);
}

function sessionCookieHeader(token: string) {
  const signedToken = signCookieValue(token);
  return [
    `better-auth.session_token=${signedToken}`,
    `__Secure-better-auth.session_token=${signedToken}`,
  ].join("; ");
}

function sessionCookie(token: string) {
  return {
    name: "better-auth.session_token",
    value: signCookieValue(token),
    url: baseUrl ?? "http://127.0.0.1:3100",
  };
}

async function newAuthenticatedContext(browser: Browser, token: string) {
  const context = await browser.newContext({
    extraHTTPHeaders: { Cookie: sessionCookieHeader(token) },
  });
  await context.addCookies([sessionCookie(token)]);
  return context;
}

function createSeed(): SubscriptionSeed {
  const suffix = randomUUID();
  return {
    userId: randomUUID(),
    businessId: randomUUID(),
    subscriptionId: randomUUID(),
    sessionToken: `e2e-subscription-session-${suffix}`,
    userName: "Owner E2E Billing",
    businessName: `Toko Billing E2E ${suffix.slice(0, 8)}`,
  };
}

async function cleanupSubscriptionSeed(sql: postgres.Sql, seed: SubscriptionSeed) {
  await sql.begin(async (tx) => {
    await tx`delete from subscription_payment where business_id = ${seed.businessId}`;
    await tx`delete from subscription where business_id = ${seed.businessId}`;
    await tx`delete from business_member where business_id = ${seed.businessId}`;
    await tx`delete from business where id = ${seed.businessId}`;
    await tx`delete from session where user_id = ${seed.userId}`;
    await tx`delete from account where user_id = ${seed.userId}`;
    await tx`delete from "user" where id = ${seed.userId}`;
  });
}

async function seedOwnerSubscription(sql: postgres.Sql, seed: SubscriptionSeed) {
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await cleanupSubscriptionSeed(sql, seed);
  await sql.begin(async (tx) => {
    await tx`
      insert into "user" (id, name, email, email_verified, privacy_accepted_at, created_at, updated_at)
      values (${seed.userId}, ${seed.userName}, ${`${seed.userId}@e2e.wazepos.test`}, true, ${now}, ${now}, ${now})
    `;
    await tx`
      insert into session (id, expires_at, token, user_id, created_at, updated_at)
      values (${randomUUID()}, ${future}, ${seed.sessionToken}, ${seed.userId}, ${now}, ${now})
    `;
    await tx`
      insert into business (id, name, type, onboarding_completed, created_at, updated_at)
      values (${seed.businessId}, ${seed.businessName}, 'Kedai kopi', true, ${now}, ${now})
    `;
    await tx`
      insert into business_member (id, business_id, user_id, role, created_at, updated_at)
      values (${randomUUID()}, ${seed.businessId}, ${seed.userId}, 'owner', ${now}, ${now})
    `;
    await tx`
      insert into subscription (id, business_id, plan, status, trial_ends_at, created_at, updated_at)
      values (${seed.subscriptionId}, ${seed.businessId}, 'tumbuh', 'trialing', ${future}, ${now}, ${now})
    `;
  });
}

async function getLatestPayment(sql: postgres.Sql, seed: SubscriptionSeed) {
  const [payment] = await sql<{
    id: string;
    plan: string;
    amount: number;
    currency: string;
    provider: string;
    providerOrderId: string;
    status: string;
    senderBank: string | null;
    senderAccountName: string | null;
    transferProofData: string | null;
    transferProofMime: string | null;
    transferProofUploadedAt: Date | null;
  }[]>`
    select
      id,
      plan,
      amount,
      currency,
      provider,
      provider_order_id as "providerOrderId",
      status,
      sender_bank as "senderBank",
      sender_account_name as "senderAccountName",
      transfer_proof_data as "transferProofData",
      transfer_proof_mime as "transferProofMime",
      transfer_proof_uploaded_at as "transferProofUploadedAt"
    from subscription_payment
    where business_id = ${seed.businessId}
      and subscription_id = ${seed.subscriptionId}
    order by created_at desc
    limit 1
  `;
  return payment;
}

test.describe("owner subscription payment flow", () => {
  test.skip(remoteBaseUrl, "Flow ini membuat pembayaran seeded, jadi hanya dijalankan pada database lokal/CI.");

  test("owner membuat pesanan transfer bank dan mengunggah bukti pembayaran", async ({ browser }) => {
    const sql = postgres(databaseUrl, { max: 1, prepare: false });
    const seed = createSeed();
    const senderBank = "Bank Owner E2E";
    const senderAccountName = "Owner Billing E2E";

    await seedOwnerSubscription(sql, seed);

    const context = await newAuthenticatedContext(browser, seed.sessionToken);
    const page = await context.newPage();

    try {
      await page.goto("/subscription");
      await expect(page.getByRole("heading", { level: 1, name: "Kelola paket wazePOS" })).toBeVisible();

      await page.getByRole("button", { name: "Buat pesanan transfer wazePOS Tumbuh" }).click();
      await expect(
        page.getByText("Pesanan transfer dibuat. Silakan transfer lalu unggah bukti pembayaran."),
      ).toBeVisible();

      await expect
        .poll(async () => getLatestPayment(sql, seed), { timeout: 15_000 })
        .toMatchObject({
          plan: "tumbuh",
          amount: 450000,
          currency: "IDR",
          provider: "bank_transfer",
          status: "pending",
          senderBank: null,
          senderAccountName: null,
          transferProofData: null,
          transferProofMime: null,
          transferProofUploadedAt: null,
        });
      const paymentAfterCheckout = await getLatestPayment(sql, seed);
      if (!paymentAfterCheckout) {
        throw new Error("Payment was not created.");
      }
      expect(paymentAfterCheckout.providerOrderId).toMatch(/^WZP-\d+-[a-f0-9]{8}$/);

      await expect(page.getByText(`Order ${paymentAfterCheckout.providerOrderId}`)).toBeVisible();
      await page.getByLabel("Bank pengirim").fill(senderBank);
      await page.getByLabel("Nama pemilik rekening pengirim").fill(senderAccountName);
      await page.locator("#transfer-proof").setInputFiles({
        name: "bukti-transfer.png",
        mimeType: "image/png",
        buffer: proofImage,
      });
      await expect(page.getByText("Gambar siap diunggah")).toBeVisible();

      await page.getByRole("button", { name: "Unggah bukti transfer" }).click();
      await expect(page.getByText("Bukti transfer diterima dan menunggu verifikasi admin.")).toBeVisible();
      await expect(page.getByText("Bukti diterima")).toBeVisible();

      await expect
        .poll(async () => getLatestPayment(sql, seed), { timeout: 15_000 })
        .toMatchObject({
          id: paymentAfterCheckout.id,
          status: "pending",
          senderBank,
          senderAccountName,
          transferProofData: proofImage.toString("base64"),
          transferProofMime: "image/png",
          transferProofUploadedAt: expect.any(Date),
        });
    } finally {
      await context.close();
      await cleanupSubscriptionSeed(sql, seed);
      await sql.end({ timeout: 2 });
    }
  });
});
