import { eq, gte, ilike, lt } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { sale } from "@/db/schema";
import { dateKeyInJakarta, getReportDateRange } from "@/lib/reporting";

export const SALE_PAYMENT_METHODS = ["cash", "qris", "debit", "credit"] as const;
export const SALE_STATUSES = ["completed", "voided"] as const;

export type SalePaymentMethod = (typeof SALE_PAYMENT_METHODS)[number];
export type SaleStatus = (typeof SALE_STATUSES)[number];

export type SaleFilterSearchParams = {
  outlet?: string;
  from?: string;
  to?: string;
  payment?: string;
  status?: string;
  q?: string;
  page?: string;
};

/** Param tanggal lama `/reports?date=YYYY-MM-DD` (sebelum ada rentang from/to). */
export type SaleFilterSearchParamsWithLegacyDate = SaleFilterSearchParams & { date?: string };

/** Konversi Date ke kunci `YYYY-MM-DD` zona Jakarta untuk default form. */
export { dateKeyInJakarta };

function pickEnum<T extends string>(value: string | undefined, allowed: readonly T[]): T | null {
  return allowed.find((item) => item === value) ?? null;
}

/** Parse `page` dari query string; invalid/negatif → 1. */
export function parsePageParam(value: string | undefined) {
  const requested = Number.parseInt(value ?? "1", 10);
  return Number.isNaN(requested) || requested < 1 ? 1 : requested;
}

/**
 * Hasil parsing filter transaksi yang dipakai halaman Transaksi & Laporan.
 * Nama field disengakan sama dengan variabel lama di kedua halaman agar refactor minim risiko.
 */
export function parseSaleFilterParams(
  params: SaleFilterSearchParamsWithLegacyDate,
  now = new Date(),
) {
  const defaultFrom = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  const { fromKey, toKey, start, end } = getReportDateRange(
    params.from ?? params.date ?? dateKeyInJakarta(defaultFrom),
    params.to ?? params.date ?? dateKeyInJakarta(now),
  );

  return {
    fromKey,
    toKey,
    /** Awal rentang (inklusif, pagi 00:00 WIB hari `fromKey`). */
    start,
    /** Akhir rentang (eksklusif). */
    end,
    paymentMethod: pickEnum(params.payment, SALE_PAYMENT_METHODS),
    transactionStatus: pickEnum(params.status, SALE_STATUSES),
    invoiceQuery: (params.q ?? "").trim().slice(0, 80),
    currentPage: parsePageParam(params.page),
  };
}

export type SaleFilterParsed = ReturnType<typeof parseSaleFilterParams>;

/**
 * Bangun daftar kondisi WHERE drizzle untuk tabel `sale` sesuai filter terparse.
 * `cashierId` membatasi hasil ke satu kasir (halaman Transaksi untuk role cashier).
 */
export function buildSaleFilterConditions(
  parsed: Pick<SaleFilterParsed, "start" | "end" | "paymentMethod" | "transactionStatus" | "invoiceQuery">,
  options: { businessId: string; outletId?: string | null; cashierId?: string | null },
): SQL[] {
  const conditions: SQL[] = [
    eq(sale.businessId, options.businessId),
    gte(sale.createdAt, parsed.start),
    lt(sale.createdAt, parsed.end),
  ];

  if (options.outletId) conditions.push(eq(sale.outletId, options.outletId));
  if (options.cashierId) conditions.push(eq(sale.cashierId, options.cashierId));
  if (parsed.paymentMethod) conditions.push(eq(sale.paymentMethod, parsed.paymentMethod));
  if (parsed.transactionStatus) conditions.push(eq(sale.status, parsed.transactionStatus));
  if (parsed.invoiceQuery) {
    conditions.push(ilike(sale.invoiceNumber, `%${parsed.invoiceQuery}%`));
  }

  return conditions;
}

/**
 * Query string yang mempertahankan filter aktif — dipakai href pagination & ekspor.
 * Parameter kosong tidak ikut disertakan.
 */
export function buildSaleFilterQuery(
  parsed: Pick<SaleFilterParsed, "fromKey" | "toKey" | "paymentMethod" | "transactionStatus" | "invoiceQuery">,
  options: { outletId?: string | null } = {},
) {
  const search = new URLSearchParams({
    from: parsed.fromKey,
    to: parsed.toKey,
    ...(parsed.paymentMethod ? { payment: parsed.paymentMethod } : {}),
    ...(parsed.transactionStatus ? { status: parsed.transactionStatus } : {}),
    ...(parsed.invoiceQuery ? { q: parsed.invoiceQuery } : {}),
    ...(options.outletId ? { outlet: options.outletId } : {}),
  });
  return search;
}
