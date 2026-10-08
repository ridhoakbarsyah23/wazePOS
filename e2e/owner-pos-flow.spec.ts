import { createHmac, randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
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

async function cleanupE2eData(sql: postgres.Sql, seed: E2eSeed) {
  await sql.begin(async (tx) => {
    await tx`delete from sale_item where sale_id in (select id from sale where business_id = ${seed.businessId})`;
    await tx`delete from stock_movement where business_id = ${seed.businessId}`;
    await tx`delete from sale where business_id = ${seed.businessId}`;
    await tx`delete from invoice_counter where business_id = ${seed.businessId}`;
    await tx`delete from inventory_stock where business_id = ${seed.businessId}`;
    await tx`delete from product where business_id = ${seed.businessId}`;
    await tx`delete from category where business_id = ${seed.businessId}`;
    await tx`delete from customer where business_id = ${seed.businessId}`;
    await tx`delete from subscription_payment where business_id = ${seed.businessId}`;
    await tx`delete from subscription where business_id = ${seed.businessId}`;
    await tx`delete from outlet where business_id = ${seed.businessId}`;
    await tx`delete from business_member where business_id = ${seed.businessId}`;
    await tx`delete from business where id = ${seed.businessId}`;
    await tx`delete from session where user_id = ${seed.userId}`;
    await tx`delete from account where user_id = ${seed.userId}`;
    await tx`delete from "user" where id = ${seed.userId}`;
  });
}

type E2eSeed = {
  userId: string;
  businessId: string;
  outletId: string;
  productId: string;
  sessionToken: string;
  productName: string;
};

type SaleResult = {
  ok: boolean;
  status: number;
  body: {
    saleId?: string;
    invoiceNumber?: string;
    total?: number;
    changeAmount?: number;
    replayed?: boolean;
    message?: string;
  };
};

type VoidSaleResult = {
  ok: boolean;
  status: number;
  body: {
    message?: string;
    status?: string;
  };
};

function createSeed(): E2eSeed {
  const suffix = randomUUID();
  return {
    userId: randomUUID(),
    businessId: randomUUID(),
    outletId: randomUUID(),
    productId: randomUUID(),
    sessionToken: `e2e-session-${suffix}`,
    productName: `Kopi E2E ${suffix.slice(0, 8)}`,
  };
}

async function seedOwnerPosData(sql: postgres.Sql, seed: E2eSeed) {
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await cleanupE2eData(sql, seed);
  await sql.begin(async (tx) => {
    await tx`
      insert into "user" (id, name, email, email_verified, privacy_accepted_at, created_at, updated_at)
      values (${seed.userId}, 'Owner E2E POS', ${`${seed.userId}@e2e.wazepos.test`}, true, ${now}, ${now}, ${now})
    `;
    await tx`
      insert into session (id, expires_at, token, user_id, created_at, updated_at)
      values (${randomUUID()}, ${future}, ${seed.sessionToken}, ${seed.userId}, ${now}, ${now})
    `;
    await tx`
      insert into business (id, name, type, onboarding_completed, created_at, updated_at)
      values (${seed.businessId}, 'Toko E2E POS', 'Kedai kopi', true, ${now}, ${now})
    `;
    await tx`
      insert into business_member (id, business_id, user_id, role, created_at, updated_at)
      values (${randomUUID()}, ${seed.businessId}, ${seed.userId}, 'owner', ${now}, ${now})
    `;
    await tx`
      insert into subscription (id, business_id, plan, status, trial_ends_at, created_at, updated_at)
      values (${randomUUID()}, ${seed.businessId}, 'bisnis', 'trialing', ${future}, ${now}, ${now})
    `;
    await tx`
      insert into outlet (id, business_id, name, slug, address, created_at, updated_at)
      values (${seed.outletId}, ${seed.businessId}, 'Gerai E2E', 'gerai-e2e', 'Jl. E2E', ${now}, ${now})
    `;
    await tx`
      insert into product (id, business_id, name, sku, selling_price, cost_price, track_stock, is_active, created_at, updated_at)
      values (${seed.productId}, ${seed.businessId}, ${seed.productName}, ${`E2E-${seed.productId.slice(0, 8)}`}, 12000, 5000, true, true, ${now}, ${now})
    `;
    await tx`
      insert into inventory_stock (id, business_id, outlet_id, product_id, quantity, low_stock_threshold, created_at, updated_at)
      values (${randomUUID()}, ${seed.businessId}, ${seed.outletId}, ${seed.productId}, 5, 2, ${now}, ${now})
    `;
  });
}

async function postCashSale(
  page: Page,
  input: {
    outletId: string;
    productId: string;
    clientRequestId: string;
    quantity?: number;
    paidAmount?: number;
  },
) {
  return page.evaluate(
    async ({ outletId, productId, clientRequestId, quantity, paidAmount }) => {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRequestId,
          outletId,
          customerId: null,
          paymentMethod: "cash",
          paidAmount,
          items: [{ productId, quantity }],
        }),
      });
      return {
        ok: response.ok,
        status: response.status,
        body: await response.json(),
      };
    },
    {
      outletId: input.outletId,
      productId: input.productId,
      clientRequestId: input.clientRequestId,
      quantity: input.quantity ?? 2,
      paidAmount: input.paidAmount ?? 27000,
    },
  ) as Promise<SaleResult>;
}

async function postVoidSale(page: Page, input: { saleId: string; reason: string }) {
  return page.evaluate(
    async ({ saleId, reason }) => {
      const response = await fetch(`/api/sales/${saleId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      return {
        ok: response.ok,
        status: response.status,
        body: await response.json(),
      };
    },
    input,
  ) as Promise<VoidSaleResult>;
}

test.describe("owner POS flow", () => {
  test.describe.configure({ mode: "serial" });

  test.skip(remoteBaseUrl, "Flow ini membuat data uji, jadi hanya dijalankan pada database lokal/CI.");

  test("owner dapat membuat transaksi tunai dan melihatnya di riwayat", async ({ browser }) => {
    const sql = postgres(databaseUrl, { max: 1, prepare: false });
    const seed = createSeed();

    await seedOwnerPosData(sql, seed);

    const context = await browser.newContext({
      extraHTTPHeaders: {
        Cookie: sessionCookieHeader(seed.sessionToken),
      },
    });
    const page = await context.newPage();

    try {
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: "Halo, Owner E2E POS" })).toBeVisible();

      const saleResult = await postCashSale(page, {
        outletId: seed.outletId,
        productId: seed.productId,
        clientRequestId: randomUUID(),
      });

      expect(saleResult.ok).toBe(true);
      expect(saleResult.status).toBe(201);
      expect(saleResult.body).toMatchObject({
        total: 24000,
        changeAmount: 3000,
        replayed: false,
      });
      expect(String(saleResult.body.invoiceNumber)).toMatch(/^INV-\d{8}-\d{4}$/);

      const [stock] = await sql<{ quantity: number }[]>`
        select quantity
        from inventory_stock
        where business_id = ${seed.businessId}
          and product_id = ${seed.productId}
          and outlet_id = ${seed.outletId}
        limit 1
      `;
      expect(Number(stock?.quantity)).toBe(3);

      await page.goto(`/transactions?q=${encodeURIComponent(String(saleResult.body.invoiceNumber))}`);
      const invoiceNumber = String(saleResult.body.invoiceNumber);
      const viewportWidth = page.viewportSize()?.width ?? 1280;

      if (viewportWidth >= 768) {
        const transactionRow = page.locator("tbody tr", { hasText: invoiceNumber }).first();
        await expect(transactionRow).toBeVisible();
        await expect(transactionRow).toContainText("Rp 24.000");
        await expect(transactionRow).toContainText("Selesai");
      } else {
        const transactionCard = page.locator('a[href^="/sales/"]', { hasText: invoiceNumber }).first();
        await expect(transactionCard).toBeVisible();
        await expect(transactionCard).toContainText("Rp 24.000");
        await expect(transactionCard).toContainText("Selesai");
      }
    } finally {
      await context.close();
      await cleanupE2eData(sql, seed);
      await sql.end({ timeout: 2 });
    }
  });

  test("clientRequestId yang sama tidak membuat transaksi dan stok dobel", async ({ browser }) => {
    const sql = postgres(databaseUrl, { max: 1, prepare: false });
    const seed = createSeed();

    await seedOwnerPosData(sql, seed);

    const context = await browser.newContext({
      extraHTTPHeaders: {
        Cookie: sessionCookieHeader(seed.sessionToken),
      },
    });
    const page = await context.newPage();

    try {
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: "Halo, Owner E2E POS" })).toBeVisible();

      const clientRequestId = randomUUID();
      const firstSale = await postCashSale(page, {
        outletId: seed.outletId,
        productId: seed.productId,
        clientRequestId,
      });
      const replayedSale = await postCashSale(page, {
        outletId: seed.outletId,
        productId: seed.productId,
        clientRequestId,
      });

      expect(firstSale.ok).toBe(true);
      expect(firstSale.status).toBe(201);
      expect(firstSale.body).toMatchObject({
        total: 24000,
        changeAmount: 3000,
        replayed: false,
      });

      expect(replayedSale.ok).toBe(true);
      expect(replayedSale.status).toBe(200);
      expect(replayedSale.body).toMatchObject({
        saleId: firstSale.body.saleId,
        invoiceNumber: firstSale.body.invoiceNumber,
        total: 24000,
        changeAmount: 3000,
        replayed: true,
      });

      const [stock] = await sql<{ quantity: number }[]>`
        select quantity
        from inventory_stock
        where business_id = ${seed.businessId}
          and product_id = ${seed.productId}
          and outlet_id = ${seed.outletId}
        limit 1
      `;
      expect(Number(stock?.quantity)).toBe(3);

      const [saleCount] = await sql<{ count: string }[]>`
        select count(*)::text as count
        from sale
        where business_id = ${seed.businessId}
          and client_request_id = ${clientRequestId}
      `;
      expect(Number(saleCount?.count)).toBe(1);

      const [movementCount] = await sql<{ count: string }[]>`
        select count(*)::text as count
        from stock_movement
        where business_id = ${seed.businessId}
          and product_id = ${seed.productId}
          and outlet_id = ${seed.outletId}
          and type = 'sale'
      `;
      expect(Number(movementCount?.count)).toBe(1);
    } finally {
      await context.close();
      await cleanupE2eData(sql, seed);
      await sql.end({ timeout: 2 });
    }
  });

  test("stok tidak cukup menolak transaksi tanpa mengubah stok", async ({ browser }) => {
    const sql = postgres(databaseUrl, { max: 1, prepare: false });
    const seed = createSeed();

    await seedOwnerPosData(sql, seed);

    const context = await browser.newContext({
      extraHTTPHeaders: {
        Cookie: sessionCookieHeader(seed.sessionToken),
      },
    });
    const page = await context.newPage();

    try {
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: "Halo, Owner E2E POS" })).toBeVisible();

      const rejectedSale = await postCashSale(page, {
        outletId: seed.outletId,
        productId: seed.productId,
        clientRequestId: randomUUID(),
        quantity: 6,
        paidAmount: 72000,
      });

      expect(rejectedSale.ok).toBe(false);
      expect(rejectedSale.status).toBe(422);
      expect(rejectedSale.body).toMatchObject({
        message: `Stok ${seed.productName} tidak mencukupi.`,
      });

      const [stock] = await sql<{ quantity: number }[]>`
        select quantity
        from inventory_stock
        where business_id = ${seed.businessId}
          and product_id = ${seed.productId}
          and outlet_id = ${seed.outletId}
        limit 1
      `;
      expect(Number(stock?.quantity)).toBe(5);

      const [saleCount] = await sql<{ count: string }[]>`
        select count(*)::text as count
        from sale
        where business_id = ${seed.businessId}
      `;
      expect(Number(saleCount?.count)).toBe(0);

      const [movementCount] = await sql<{ count: string }[]>`
        select count(*)::text as count
        from stock_movement
        where business_id = ${seed.businessId}
      `;
      expect(Number(movementCount?.count)).toBe(0);
    } finally {
      await context.close();
      await cleanupE2eData(sql, seed);
      await sql.end({ timeout: 2 });
    }
  });

  test("void transaksi mengubah status dan mengembalikan stok", async ({ browser }) => {
    const sql = postgres(databaseUrl, { max: 1, prepare: false });
    const seed = createSeed();

    await seedOwnerPosData(sql, seed);

    const context = await browser.newContext({
      extraHTTPHeaders: {
        Cookie: sessionCookieHeader(seed.sessionToken),
      },
    });
    const page = await context.newPage();

    try {
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: "Halo, Owner E2E POS" })).toBeVisible();

      const saleResult = await postCashSale(page, {
        outletId: seed.outletId,
        productId: seed.productId,
        clientRequestId: randomUUID(),
      });
      expect(saleResult.ok).toBe(true);
      expect(saleResult.status).toBe(201);

      const saleId = saleResult.body.saleId;
      const invoiceNumber = saleResult.body.invoiceNumber;
      if (!saleId || !invoiceNumber) {
        throw new Error("Sale response did not include saleId and invoiceNumber.");
      }

      const [stockAfterSale] = await sql<{ quantity: number }[]>`
        select quantity
        from inventory_stock
        where business_id = ${seed.businessId}
          and product_id = ${seed.productId}
          and outlet_id = ${seed.outletId}
        limit 1
      `;
      expect(Number(stockAfterSale?.quantity)).toBe(3);

      const voidReason = "Pelanggan membatalkan pesanan";
      const voidResult = await postVoidSale(page, {
        saleId: String(saleId),
        reason: voidReason,
      });

      expect(voidResult.ok).toBe(true);
      expect(voidResult.status).toBe(200);
      expect(voidResult.body).toMatchObject({
        message: `Transaksi ${invoiceNumber} berhasil dibatalkan (void). Stok barang telah dikembalikan.`,
        status: "voided",
      });

      const [voidedSale] = await sql<{
        saleStatus: string;
        voidReason: string | null;
        voidedById: string | null;
      }[]>`
        select status as "saleStatus", void_reason as "voidReason", voided_by_id as "voidedById"
        from sale
        where id = ${saleId}
          and business_id = ${seed.businessId}
        limit 1
      `;
      expect(voidedSale).toMatchObject({
        saleStatus: "voided",
        voidReason,
        voidedById: seed.userId,
      });

      const [stockAfterVoid] = await sql<{ quantity: number }[]>`
        select quantity
        from inventory_stock
        where business_id = ${seed.businessId}
          and product_id = ${seed.productId}
          and outlet_id = ${seed.outletId}
        limit 1
      `;
      expect(Number(stockAfterVoid?.quantity)).toBe(5);

      const movements = await sql<{ type: string; quantity: number; note: string | null }[]>`
        select type, quantity, note
        from stock_movement
        where business_id = ${seed.businessId}
          and product_id = ${seed.productId}
          and outlet_id = ${seed.outletId}
        order by created_at asc
      `;
      expect(movements).toEqual([
        expect.objectContaining({
          type: "sale",
          quantity: -2,
          note: `Penjualan ${invoiceNumber}`,
        }),
        expect.objectContaining({
          type: "adjustment",
          quantity: 2,
          note: `Void ${invoiceNumber}: ${voidReason}`,
        }),
      ]);
    } finally {
      await context.close();
      await cleanupE2eData(sql, seed);
      await sql.end({ timeout: 2 });
    }
  });

  test("owner tidak bisa membuat transaksi memakai data bisnis lain", async ({ browser }) => {
    const sql = postgres(databaseUrl, { max: 1, prepare: false });
    const ownerSeed = createSeed();
    const otherBusinessSeed = createSeed();

    await seedOwnerPosData(sql, ownerSeed);
    await seedOwnerPosData(sql, otherBusinessSeed);

    const context = await browser.newContext({
      extraHTTPHeaders: {
        Cookie: sessionCookieHeader(ownerSeed.sessionToken),
      },
    });
    const page = await context.newPage();

    try {
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: "Halo, Owner E2E POS" })).toBeVisible();

      const otherOutletSale = await postCashSale(page, {
        outletId: otherBusinessSeed.outletId,
        productId: otherBusinessSeed.productId,
        clientRequestId: randomUUID(),
      });

      expect(otherOutletSale.ok).toBe(false);
      expect(otherOutletSale.status).toBe(422);
      expect(otherOutletSale.body).toMatchObject({
        message: "Gerai tidak ditemukan.",
      });

      const otherProductSale = await postCashSale(page, {
        outletId: ownerSeed.outletId,
        productId: otherBusinessSeed.productId,
        clientRequestId: randomUUID(),
      });

      expect(otherProductSale.ok).toBe(false);
      expect(otherProductSale.status).toBe(422);
      expect(otherProductSale.body).toMatchObject({
        message: "Ada produk yang sudah tidak aktif.",
      });

      const [saleCount] = await sql<{ count: string }[]>`
        select count(*)::text as count
        from sale
        where business_id in (${ownerSeed.businessId}, ${otherBusinessSeed.businessId})
      `;
      expect(Number(saleCount?.count)).toBe(0);

      const [ownerStock] = await sql<{ quantity: number }[]>`
        select quantity
        from inventory_stock
        where business_id = ${ownerSeed.businessId}
          and product_id = ${ownerSeed.productId}
          and outlet_id = ${ownerSeed.outletId}
        limit 1
      `;
      expect(Number(ownerStock?.quantity)).toBe(5);

      const [otherStock] = await sql<{ quantity: number }[]>`
        select quantity
        from inventory_stock
        where business_id = ${otherBusinessSeed.businessId}
          and product_id = ${otherBusinessSeed.productId}
          and outlet_id = ${otherBusinessSeed.outletId}
        limit 1
      `;
      expect(Number(otherStock?.quantity)).toBe(5);

      const [movementCount] = await sql<{ count: string }[]>`
        select count(*)::text as count
        from stock_movement
        where business_id in (${ownerSeed.businessId}, ${otherBusinessSeed.businessId})
      `;
      expect(Number(movementCount?.count)).toBe(0);
    } finally {
      await context.close();
      await cleanupE2eData(sql, ownerSeed);
      await cleanupE2eData(sql, otherBusinessSeed);
      await sql.end({ timeout: 2 });
    }
  });
});
