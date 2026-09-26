import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { invoiceCounter } from "@/db/schema";
import { dateKeyInJakarta } from "@/server/pos/reporting";

/**
 * Tipe klien transaksi drizzle — diambil dari konfigurasi `db` agar
 * helper ini selalu konsisten dengan driver yang dipakai aplikasi.
 */
type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Membentuk nomor invoice `INV-YYYYMMDD-NNNN` dari tanggal transaksi
 * (zona Asia/Jakarta) dan nomor antrian harian, contoh: INV-20260924-0007.
 */
export function formatInvoiceNumber(counterDate: string, sequence: number): string {
  return `INV-${counterDate}-${String(sequence).padStart(4, "0")}`;
}

/** Kunci tanggal YYYYMMDD (WIB) untuk tabel counter dan format invoice. */
export function invoiceCounterDateKey(now: Date): string {
  return dateKeyInJakarta(now).replace(/-/g, "");
}

/**
 * Mengambil dan menaikkan nomor antrian invoice secara atomik per usaha per hari.
 * `INSERT ... ON CONFLICT DO UPDATE` menjamin tidak ada dua transaksi yang
 * mendapatkan nomor yang sama, bahkan saat dieksekusi bersamaan.
 */
export async function nextInvoiceNumber(
  tx: TransactionClient,
  businessId: string,
  now: Date = new Date(),
): Promise<string> {
  const counterDate = invoiceCounterDateKey(now);

  const [row] = await tx
    .insert(invoiceCounter)
    .values({
      id: randomUUID(),
      businessId,
      counterDate,
      lastNumber: 1,
    })
    .onConflictDoUpdate({
      target: [invoiceCounter.businessId, invoiceCounter.counterDate],
      set: {
        lastNumber: sql`${invoiceCounter.lastNumber} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning({ lastNumber: invoiceCounter.lastNumber });

  const sequence = Number(row?.lastNumber ?? 1);
  return formatInvoiceNumber(counterDate, sequence);
}
