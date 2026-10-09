import { createHmac, randomUUID } from "node:crypto";
import { expect, type Browser, type BrowserContext, type Page, test } from "@playwright/test";
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
const adminEmail = "admin@wazepos.test";

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

async function closeContextCleanly(page: Page, context: BrowserContext) {
  await page.goto("/api/live").catch(() => undefined);
  await context.close();
}

type AdminPaymentSeed = {
  adminSessionToken: string;
  businessId: string;
  businessName: string;
  subscriptionId: string;
  paymentId: string;
  providerOrderId: string;
  verificationNote: string;
};

type RegularUserSeed = {
  userId: string;
  sessionToken: string;
  email: string;
};

function createSeed(label: string): AdminPaymentSeed {
  const suffix = randomUUID();
  return {
    adminSessionToken: `e2e-admin-session-${suffix}`,
    businessId: randomUUID(),
    businessName: `Toko Admin Payment ${label} ${suffix.slice(0, 8)}`,
    subscriptionId: randomUUID(),
    paymentId: randomUUID(),
    providerOrderId: `E2E-${label.toUpperCase()}-${suffix.slice(0, 8)}`,
    verificationNote: `Catatan ${label} ${suffix.slice(0, 8)}`,
  };
}

function createRegularUserSeed(): RegularUserSeed {
  const suffix = randomUUID();
  return {
    userId: randomUUID(),
    sessionToken: `e2e-regular-session-${suffix}`,
    email: `regular-${suffix}@e2e.wazepos.test`,
  };
}

async function cleanupPaymentSeed(sql: postgres.Sql, seed: AdminPaymentSeed) {
  await sql.begin(async (tx) => {
    await tx`delete from platform_admin_audit_log where business_id = ${seed.businessId}`;
    await tx`delete from subscription_payment where business_id = ${seed.businessId}`;
    await tx`delete from subscription where business_id = ${seed.businessId}`;
    await tx`delete from business where id = ${seed.businessId}`;
    await tx`delete from session where token = ${seed.adminSessionToken}`;
  });
}

async function seedRegularUser(sql: postgres.Sql, seed: RegularUserSeed) {
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await sql.begin(async (tx) => {
    await tx`
      insert into "user" (id, name, email, email_verified, privacy_accepted_at, created_at, updated_at)
      values (${seed.userId}, 'Regular E2E User', ${seed.email}, true, ${now}, ${now}, ${now})
    `;
    await tx`
      insert into session (id, expires_at, token, user_id, created_at, updated_at)
      values (${randomUUID()}, ${future}, ${seed.sessionToken}, ${seed.userId}, ${now}, ${now})
    `;
  });
}

async function cleanupRegularUser(sql: postgres.Sql, seed: RegularUserSeed) {
  await sql.begin(async (tx) => {
    await tx`delete from session where user_id = ${seed.userId}`;
    await tx`delete from account where user_id = ${seed.userId}`;
    await tx`delete from "user" where id = ${seed.userId}`;
  });
}

async function seedPlatformAdminPayment(
  sql: postgres.Sql,
  seed: AdminPaymentSeed,
  options: { proofUploaded: boolean; status?: "pending" | "paid" },
) {
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const status = options.status ?? "pending";
  const [admin] = await sql<{ id: string }[]>`
    insert into "user" (id, name, email, email_verified, privacy_accepted_at, created_at, updated_at)
    values (${randomUUID()}, 'Platform Admin E2E', ${adminEmail}, true, ${now}, ${now}, ${now})
    on conflict (email) do update
      set email_verified = true,
          updated_at = ${now}
    returning id
  `;

  if (!admin?.id) {
    throw new Error("Platform admin E2E user was not created.");
  }

  await cleanupPaymentSeed(sql, seed);
  await sql.begin(async (tx) => {
    await tx`
      insert into session (id, expires_at, token, user_id, created_at, updated_at)
      values (${randomUUID()}, ${future}, ${seed.adminSessionToken}, ${admin.id}, ${now}, ${now})
    `;
    await tx`
      insert into business (id, name, type, onboarding_completed, created_at, updated_at)
      values (${seed.businessId}, ${seed.businessName}, 'Kedai kopi', true, ${now}, ${now})
    `;
    await tx`
      insert into subscription (
        id,
        business_id,
        plan,
        status,
        trial_ends_at,
        current_period_start,
        current_period_end,
        created_at,
        updated_at
      )
      values (
        ${seed.subscriptionId},
        ${seed.businessId},
        ${status === "paid" ? "bisnis" : "tumbuh"},
        ${status === "paid" ? "active" : "trialing"},
        ${future},
        ${status === "paid" ? now : null},
        ${status === "paid" ? future : null},
        ${now},
        ${now}
      )
    `;
    await tx`
      insert into subscription_payment (
        id,
        business_id,
        subscription_id,
        plan,
        amount,
        currency,
        provider,
        provider_order_id,
        status,
        sender_bank,
        sender_account_name,
        transfer_proof_data,
        transfer_proof_mime,
        transfer_proof_uploaded_at,
        verified_by,
        verified_at,
        paid_at,
        created_at,
        updated_at
      )
      values (
        ${seed.paymentId},
        ${seed.businessId},
        ${seed.subscriptionId},
        'bisnis',
        199000,
        'IDR',
        'bank_transfer',
        ${seed.providerOrderId},
        ${status},
        'Bank E2E',
        'Owner E2E',
        ${options.proofUploaded ? "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=" : null},
        ${options.proofUploaded ? "image/png" : null},
        ${options.proofUploaded ? now : null},
        ${status === "paid" ? adminEmail : null},
        ${status === "paid" ? now : null},
        ${status === "paid" ? now : null},
        ${now},
        ${now}
      )
    `;
  });
}

async function getPaymentState(sql: postgres.Sql, seed: AdminPaymentSeed) {
  const [payment] = await sql<{
    status: string;
    verifiedBy: string | null;
    verificationNote: string | null;
    paidAt: Date | null;
    disbursedAt: Date | null;
    disbursedBy: string | null;
    disbursementReference: string | null;
    disbursementNote: string | null;
  }[]>`
    select
      status,
      verified_by as "verifiedBy",
      verification_note as "verificationNote",
      paid_at as "paidAt",
      disbursed_at as "disbursedAt",
      disbursed_by as "disbursedBy",
      disbursement_reference as "disbursementReference",
      disbursement_note as "disbursementNote"
    from subscription_payment
    where id = ${seed.paymentId}
    limit 1
  `;
  const [subscription] = await sql<{
    plan: string;
    status: string;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
  }[]>`
    select plan, status, current_period_start as "currentPeriodStart", current_period_end as "currentPeriodEnd"
    from subscription
    where id = ${seed.subscriptionId}
    limit 1
  `;
  const [audit] = await sql<{ decision: string | null }[]>`
    select metadata->>'decision' as decision
    from platform_admin_audit_log
    where business_id = ${seed.businessId}
      and action = 'payment_verified'
      and entity_id = ${seed.paymentId}
    order by created_at desc
    limit 1
  `;
  const [disbursementAudit] = await sql<{ reference: string | null; orderId: string | null }[]>`
    select metadata->>'reference' as reference, metadata->>'orderId' as "orderId"
    from platform_admin_audit_log
    where business_id = ${seed.businessId}
      and action = 'payment_disbursed'
      and entity_id = ${seed.paymentId}
    order by created_at desc
    limit 1
  `;

  return { payment, subscription, audit, disbursementAudit };
}

test.describe("platform admin payment verification", () => {
  test.skip(remoteBaseUrl, "Flow ini memverifikasi pembayaran seeded, jadi hanya dijalankan pada database lokal/CI.");

  test("admin menyetujui transfer bank dan mengaktifkan langganan", async ({ browser }) => {
    const sql = postgres(databaseUrl, { max: 1, prepare: false });
    const seed = createSeed("approve");

    await seedPlatformAdminPayment(sql, seed, { proofUploaded: true });

    const context = await newAuthenticatedContext(browser, seed.adminSessionToken);
    const page = await context.newPage();

    try {
      await page.goto(`/admin/payments?status=pending&q=${encodeURIComponent(seed.providerOrderId)}`);
      await expect(page.getByRole("heading", { level: 1, name: "Daftar pembayaran" })).toBeVisible();
      const paymentList = page.getByRole("region", { name: "Daftar pembayaran" });
      await expect(paymentList.locator(`[title="${seed.providerOrderId}"]:visible`).first()).toBeVisible();

      await paymentList.getByRole("button", { name: /^Verifikasi/ }).first().click();
      const dialog = page.getByRole("alertdialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(seed.providerOrderId)).toBeVisible();
      await expect(dialog.getByAltText(`Bukti transfer ${seed.providerOrderId}`)).toBeVisible();

      await dialog.getByRole("button", { name: /Setujui & Aktifkan/ }).click();

      await expect
        .poll(async () => getPaymentState(sql, seed), { timeout: 15_000 })
        .toMatchObject({
          payment: {
            status: "paid",
            verifiedBy: adminEmail,
            paidAt: expect.any(Date),
          },
          subscription: {
            plan: "bisnis",
            status: "active",
            currentPeriodStart: expect.any(Date),
            currentPeriodEnd: expect.any(Date),
          },
          audit: {
            decision: "approve",
          },
        });
      await expect(dialog).toBeHidden();
      await expect(paymentList.getByText("Tidak ada pembayaran yang cocok dengan pencarian atau filter.")).toBeVisible();
    } finally {
      await closeContextCleanly(page, context);
      await cleanupPaymentSeed(sql, seed);
      await sql.end({ timeout: 2 });
    }
  });

  test("admin menolak transfer bank dengan catatan", async ({ browser }) => {
    const sql = postgres(databaseUrl, { max: 1, prepare: false });
    const seed = createSeed("reject");

    await seedPlatformAdminPayment(sql, seed, { proofUploaded: false });

    const context = await newAuthenticatedContext(browser, seed.adminSessionToken);
    const page = await context.newPage();

    try {
      await page.goto(`/admin/payments?status=pending&q=${encodeURIComponent(seed.providerOrderId)}`);
      await expect(page.getByRole("heading", { level: 1, name: "Daftar pembayaran" })).toBeVisible();
      const paymentList = page.getByRole("region", { name: "Daftar pembayaran" });
      await expect(paymentList.locator(`[title="${seed.providerOrderId}"]:visible`).first()).toBeVisible();

      await paymentList.getByRole("button", { name: /^Verifikasi/ }).first().click();
      const dialog = page.getByRole("alertdialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText("Owner belum mengunggah bukti transfer.")).toBeVisible();

      await dialog.getByLabel("Catatan verifikasi (wajib bila menolak)").fill(seed.verificationNote);
      await dialog.getByRole("button", { name: /Tolak/ }).click();

      await expect
        .poll(async () => getPaymentState(sql, seed), { timeout: 15_000 })
        .toMatchObject({
          payment: {
            status: "failed",
            verifiedBy: adminEmail,
            verificationNote: seed.verificationNote,
            paidAt: null,
          },
          subscription: {
            plan: "tumbuh",
            status: "trialing",
            currentPeriodStart: null,
            currentPeriodEnd: null,
          },
          audit: {
            decision: "reject",
          },
        });
      await expect(dialog).toBeHidden();
      await expect(paymentList.getByText("Tidak ada pembayaran yang cocok dengan pencarian atau filter.")).toBeVisible();
    } finally {
      await closeContextCleanly(page, context);
      await cleanupPaymentSeed(sql, seed);
      await sql.end({ timeout: 2 });
    }
  });

  test("admin menandai pembayaran berhasil sebagai sudah dicairkan", async ({ browser }) => {
    const sql = postgres(databaseUrl, { max: 1, prepare: false });
    const seed = createSeed("disburse");
    const reference = `MUTASI-${seed.providerOrderId}`;
    const note = `Pencairan ${seed.providerOrderId}`;

    await seedPlatformAdminPayment(sql, seed, { proofUploaded: true, status: "paid" });

    const context = await newAuthenticatedContext(browser, seed.adminSessionToken);
    const page = await context.newPage();

    try {
      await page.goto(`/admin/payments?status=paid&q=${encodeURIComponent(seed.providerOrderId)}`);
      await expect(page.getByRole("heading", { level: 1, name: "Daftar pembayaran" })).toBeVisible();
      const paymentList = page.getByRole("region", { name: "Daftar pembayaran" });
      await expect(paymentList.locator(`[title="${seed.providerOrderId}"]:visible`).first()).toBeVisible();

      await paymentList.getByRole("button", { name: "Tandai dicairkan" }).first().click();
      const dialog = page.getByRole("alertdialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(seed.providerOrderId)).toBeVisible();

      await dialog.getByLabel("Referensi pencairan (opsional)").fill(reference);
      await dialog.getByLabel("Catatan pencairan (opsional)").fill(note);
      await dialog.getByRole("button", { name: "Tandai sudah dicairkan" }).click();

      await expect
        .poll(async () => getPaymentState(sql, seed), { timeout: 15_000 })
        .toMatchObject({
          payment: {
            status: "paid",
            disbursedAt: expect.any(Date),
            disbursedBy: adminEmail,
            disbursementReference: reference,
            disbursementNote: note,
          },
          disbursementAudit: {
            reference,
            orderId: seed.providerOrderId,
          },
        });
      await expect(dialog).toBeHidden();
      await expect(paymentList.locator("span:visible").filter({ hasText: "Dicairkan" }).first()).toBeVisible();
    } finally {
      await closeContextCleanly(page, context);
      await cleanupPaymentSeed(sql, seed);
      await sql.end({ timeout: 2 });
    }
  });
});

test.describe("platform admin access guard", () => {
  test.skip(remoteBaseUrl, "Flow ini memakai session seeded, jadi hanya dijalankan pada database lokal/CI.");

  test("API admin menolak request anonymous", async ({ request }) => {
    const response = await request.get("/api/admin/payments/pending-count");
    const payload = (await response.json()) as { message?: string };

    expect(response.status()).toBe(401);
    expect(payload).toMatchObject({ message: "Sesi tidak ditemukan." });
  });

  test("user biasa tidak bisa membuka halaman atau API Platform Admin", async ({ browser }) => {
    const sql = postgres(databaseUrl, { max: 1, prepare: false });
    const seed = createRegularUserSeed();

    await seedRegularUser(sql, seed);

    const context = await newAuthenticatedContext(browser, seed.sessionToken);
    const page = await context.newPage();

    try {
      const pageResponse = await page.goto("/admin/payments");
      expect(pageResponse?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();

      const apiResponse = await context.request.get("/api/admin/payments/pending-count");
      const payload = (await apiResponse.json()) as { message?: string };

      expect(apiResponse.status()).toBe(403);
      expect(payload).toMatchObject({ message: "Akses admin ditolak." });
    } finally {
      await closeContextCleanly(page, context);
      await cleanupRegularUser(sql, seed);
      await sql.end({ timeout: 2 });
    }
  });
});
