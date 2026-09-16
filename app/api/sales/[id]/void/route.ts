import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryStock, product, sale, saleItem, stockMovement } from "@/db/schema";
import { auth } from "@/lib/auth";
import { canManageBusiness, getMembership } from "@/lib/auth-session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Sesi Anda sudah berakhir. Silakan masuk kembali." }, { status: 401 });
  }

  const membership = await getMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ message: "Profil usaha belum tersedia." }, { status: 403 });
  }

  if (!canManageBusiness(membership.role)) {
    return NextResponse.json(
      { message: "Hanya Pemilik Usaha (Owner) atau Admin yang berhak membatalkan (void) transaksi." },
      { status: 403 }
    );
  }

  const { id } = await params;

  let body: { reason?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // Body bersifat opsional
  }

  const rawReason = typeof body.reason === "string" ? body.reason.trim() : "";
  const reason = rawReason.length > 0 ? rawReason.slice(0, 200) : "Pembatalan transaksi oleh pengelola";

  try {
    const result = await db.transaction(async (tx) => {
      const [saleRecord] = await tx
        .select()
        .from(sale)
        .where(and(eq(sale.id, id), eq(sale.businessId, membership.businessId)))
        .limit(1);

      if (!saleRecord) {
        throw new Error("NOT_FOUND");
      }

      if (saleRecord.status === "voided") {
        throw new Error("ALREADY_VOIDED");
      }

      // Update status penjualan menjadi voided
      await tx
        .update(sale)
        .set({
          status: "voided",
          updatedAt: new Date(),
        })
        .where(eq(sale.id, saleRecord.id));

      // Ambil seluruh item penjualan bersangkutan
      const items = await tx
        .select({
          productId: saleItem.productId,
          productName: saleItem.productName,
          quantity: saleItem.quantity,
          trackStock: product.trackStock,
        })
        .from(saleItem)
        .innerJoin(product, eq(product.id, saleItem.productId))
        .where(eq(saleItem.saleId, saleRecord.id));

      // Kembalikan stok untuk produk yang melacak stok
      for (const item of items) {
        if (!item.trackStock) continue;

        await tx
          .update(inventoryStock)
          .set({
            quantity: sql`${inventoryStock.quantity} + ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventoryStock.productId, item.productId),
              eq(inventoryStock.outletId, saleRecord.outletId),
              eq(inventoryStock.businessId, membership.businessId)
            )
          );

        await tx.insert(stockMovement).values({
          id: randomUUID(),
          businessId: membership.businessId,
          outletId: saleRecord.outletId,
          productId: item.productId,
          userId: session.user.id,
          type: "adjustment",
          quantity: item.quantity,
          note: `Void ${saleRecord.invoiceNumber}: ${reason}`,
        });
      }

      return {
        invoiceNumber: saleRecord.invoiceNumber,
        status: "voided",
      };
    });

    return NextResponse.json({
      message: `Transaksi ${result.invoiceNumber} berhasil dibatalkan (void). Stok barang telah dikembalikan.`,
      status: result.status,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ message: "Transaksi tidak ditemukan." }, { status: 404 });
    }
    if (msg === "ALREADY_VOIDED") {
      return NextResponse.json({ message: "Transaksi ini sudah pernah dibatalkan sebelumnya." }, { status: 409 });
    }
    console.error("Gagal melakukan void transaksi:", error);
    return NextResponse.json({ message: "Gagal membatalkan transaksi. Silakan coba lagi." }, { status: 500 });
  }
}
