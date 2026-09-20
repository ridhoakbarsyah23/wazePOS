import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryStock, outlet, product, sale, saleItem, stockMovement } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getBusinessSubscription, getMembership } from "@/lib/auth-session";
import { getSubscriptionStatusDetails, hasPlanFeature } from "@/lib/plans";
import { saleSchema } from "@/lib/validation/sale";

function makeInvoiceNumber() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return `INV-${stamp}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Sesi Anda sudah berakhir. Silakan masuk kembali." }, { status: 401 });
  }

  const membership = await getMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ message: "Profil usaha belum tersedia." }, { status: 403 });
  }

  const currentSubscription = await getBusinessSubscription(membership.businessId);
  const subDetails = getSubscriptionStatusDetails(currentSubscription);
  if (!subDetails.isValid) {
    return NextResponse.json(
      {
        message: "Masa uji coba gratis (trial) atau langganan gerai ini telah berakhir. Silakan perpanjang paket langganan untuk melanjutkan transaksi.",
        code: "SUBSCRIPTION_EXPIRED",
      },
      { status: 403 }
    );
  }

  const allowsAllPayments = hasPlanFeature(currentSubscription?.plan, "allPaymentMethods");
  const allowsQrisPayments = hasPlanFeature(currentSubscription?.plan, "qrisPayments");

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format transaksi tidak valid." }, { status: 400 });
  }

  const parsed = saleSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Periksa transaksi." }, { status: 422 });
  }
  if ((parsed.data.paymentMethod === "debit" || parsed.data.paymentMethod === "credit") && !allowsAllPayments) {
    return NextResponse.json({ message: "Seluruh metode pembayaran (Kartu Debit & Kredit EDC) tersedia pada Paket Bisnis.", code: "PLAN_FEATURE_REQUIRED" }, { status: 403 });
  }
  if (parsed.data.paymentMethod === "qris" && !allowsQrisPayments) {
    return NextResponse.json(
      {
        message: "Pembayaran QRIS belum tersedia sampai integrasi penyedia pembayaran resmi selesai.",
        code: "PAYMENT_METHOD_UNAVAILABLE",
      },
      { status: 403 },
    );
  }

  const quantities = new Map<string, number>();
  for (const item of parsed.data.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  const items = [...quantities.entries()].map(([productId, quantity]) => ({ productId, quantity }));

  try {
    const result = await db.transaction(async (tx) => {
      const [selectedOutlet] = await tx
        .select({ id: outlet.id })
        .from(outlet)
        .where(and(eq(outlet.id, parsed.data.outletId), eq(outlet.businessId, membership.businessId)))
        .limit(1);

      if (!selectedOutlet) {
        throw new Error("OUTLET_NOT_FOUND");
      }

      const catalog = await tx
        .select({
          id: product.id,
          name: product.name,
          sellingPrice: product.sellingPrice,
          costPrice: product.costPrice,
          trackStock: product.trackStock,
          stockId: inventoryStock.id,
          quantity: inventoryStock.quantity,
        })
        .from(product)
        .leftJoin(
          inventoryStock,
          and(eq(inventoryStock.productId, product.id), eq(inventoryStock.outletId, parsed.data.outletId)),
        )
        .where(and(eq(product.businessId, membership.businessId), eq(product.isActive, true)));

      const byId = new Map(catalog.map((item) => [item.id, item]));
      const lineItems = items.map((item) => {
        const catalogItem = byId.get(item.productId);
        if (!catalogItem) throw new Error("PRODUCT_NOT_FOUND");
        if (catalogItem.trackStock && (catalogItem.quantity ?? 0) < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${catalogItem.name}`);
        }
        return {
          ...item,
          name: catalogItem.name,
          unitPrice: catalogItem.sellingPrice,
          unitCost: catalogItem.costPrice,
          subtotal: catalogItem.sellingPrice * item.quantity,
          trackStock: catalogItem.trackStock,
          stockId: catalogItem.stockId,
        };
      });

      const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
      if (lineItems.some((item) => item.subtotal > 2_000_000_000) || subtotal > 2_000_000_000) {
        throw new Error("TRANSACTION_LIMIT");
      }
      const total = subtotal;
      const invoiceNumber = makeInvoiceNumber();
      if (parsed.data.paidAmount < total) {
        throw new Error("INSUFFICIENT_PAYMENT");
      }

      for (const item of lineItems) {
        if (!item.trackStock || !item.stockId) continue;
        const updated = await tx
          .update(inventoryStock)
          .set({
            quantity: sql`${inventoryStock.quantity} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventoryStock.id, item.stockId),
              sql`${inventoryStock.quantity} >= ${item.quantity}`,
            ),
          )
          .returning({ id: inventoryStock.id });
        if (updated.length !== 1) {
          throw new Error(`INSUFFICIENT_STOCK:${item.name}`);
        }
      }

      const saleId = randomUUID();
      await tx.insert(sale).values({
        id: saleId,
        businessId: membership.businessId,
        outletId: parsed.data.outletId,
        cashierId: session.user.id,
        invoiceNumber,
        subtotal,
        discount: 0,
        total,
        paidAmount: parsed.data.paidAmount,
        changeAmount: parsed.data.paidAmount - total,
        paymentMethod: parsed.data.paymentMethod,
        status: "completed",
      });

      await tx.insert(saleItem).values(
        lineItems.map((item) => ({
          id: randomUUID(),
          saleId,
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitCost: item.unitCost,
          subtotal: item.subtotal,
        })),
      );

      const stockMovements = lineItems
        .filter((item) => item.trackStock)
        .map((item) => ({
            id: randomUUID(),
            businessId: membership.businessId,
            outletId: parsed.data.outletId,
            productId: item.productId,
            userId: session.user.id,
            type: "sale" as const,
            quantity: -item.quantity,
            note: `Penjualan ${invoiceNumber}`,
          }));
      if (stockMovements.length > 0) {
        await tx.insert(stockMovement).values(stockMovements);
      }

      return { saleId, invoiceNumber, total, changeAmount: parsed.data.paidAmount - total };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "OUTLET_NOT_FOUND") {
      return NextResponse.json({ message: "Gerai tidak ditemukan." }, { status: 422 });
    }
    if (message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ message: "Ada produk yang sudah tidak aktif." }, { status: 422 });
    }
    if (message === "INSUFFICIENT_PAYMENT") {
      return NextResponse.json({ message: "Jumlah pembayaran kurang dari total transaksi." }, { status: 422 });
    }
    if (message === "TRANSACTION_LIMIT") {
      return NextResponse.json({ message: "Nilai transaksi melebihi batas yang didukung." }, { status: 422 });
    }
    if (message.startsWith("INSUFFICIENT_STOCK:")) {
      return NextResponse.json({ message: `Stok ${message.slice("INSUFFICIENT_STOCK:".length)} tidak mencukupi.` }, { status: 422 });
    }
    console.error("Failed to create sale", error);
    return NextResponse.json({ message: "Transaksi gagal disimpan. Silakan coba lagi." }, { status: 500 });
  }
}
