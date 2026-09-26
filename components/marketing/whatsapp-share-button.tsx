"use client";

import { useState } from "react";
import { MessageSquareShare, Send, X } from "lucide-react";
import { paymentLabel } from "@/shared/billing/payment";

export type ReceiptShareData = {
  businessName: string;
  outletName: string;
  invoiceNumber: string;
  /** Nama member pelanggan yang dilampirkan pada transaksi (opsional). */
  customerName?: string | null;
  createdAt: Date | string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount?: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: string;
  saleId: string;
};

export function buildReceiptWhatsAppMessage(data: ReceiptShareData, siteUrl: string = ""): string {
  const money = (val: number) => `Rp ${Number(val).toLocaleString("id-ID")}`;
  const dateStr = new Date(data.createdAt).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const lines = [
    `🧾 *STRUK PEMBAYARAN*`,
    `*${data.businessName}*`,
    `Gerai: ${data.outletName}`,
    `No. Invoice: *${data.invoiceNumber}*`,
    `Waktu: ${dateStr}`,
    ...(data.customerName ? [`Member: *${data.customerName}*`] : []),
    `--------------------------------`,
    `*Rincian Pesanan:*`,
  ];

  for (const item of data.items) {
    lines.push(`• ${item.quantity}x ${item.name} (${money(item.unitPrice)}) = *${money(item.subtotal)}*`);
  }

  lines.push(`--------------------------------`);
  lines.push(`Subtotal: ${money(data.subtotal)}`);
  if (data.discount && data.discount > 0) {
    lines.push(`Diskon: -${money(data.discount)}`);
  }
  lines.push(`*TOTAL: ${money(data.total)}*`);
  lines.push(`Metode Bayar: ${paymentLabel(data.paymentMethod)}`);
  lines.push(`Dibayar: ${money(data.paidAmount)}`);
  if (data.paymentMethod === "cash") {
    lines.push(`Kembalian: ${money(data.changeAmount)}`);
  }
  lines.push(`--------------------------------`);
  lines.push(`Terima kasih telah berbelanja! 🙏`);

  if (siteUrl && data.saleId) {
    lines.push(`Cek nota digital: ${siteUrl}/sales/${data.saleId}`);
  }

  return lines.join("\n");
}

export function WhatsAppShareButton({
  receipt,
  siteUrl = "",
}: {
  receipt: ReceiptShareData;
  siteUrl?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  function handleSend() {
    let cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    } else if (cleanPhone.length > 0 && !cleanPhone.startsWith("62")) {
      cleanPhone = "62" + cleanPhone;
    }

    const text = buildReceiptWhatsAppMessage(receipt, siteUrl || window.location.origin);
    const encodedText = encodeURIComponent(text);

    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(waUrl, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#25D366] bg-[#f0fbf4] px-3.5 py-2 text-xs font-bold text-[#1a8e48] shadow-xs transition hover:bg-[#e3f8ec] active:scale-[0.98] print:hidden"
        title="Kirim bukti struk pembayaran via WhatsApp"
      >
        <MessageSquareShare className="size-3.5" />
        <span>Kirim ke WA</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in print:hidden">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-[#dfe8e3]">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 grid size-7 place-items-center rounded-full bg-[#f0f4f1] text-[#627069] transition hover:bg-[#dfe8e3]"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-2 text-[#1a8e48] mb-1">
              <div className="grid size-8 place-items-center rounded-full bg-[#e3f8ec]">
                <MessageSquareShare className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#15211d]">Kirim Struk ke WhatsApp</h3>
                <p className="text-[11px] text-[#627069]">Invoice #{receipt.invoiceNumber}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="grid gap-1 text-xs font-bold text-[#15211d]">
                <span>Nomor WhatsApp Pelanggan</span>
                <input
                  type="tel"
                  autoFocus
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Contoh: 08123456789 (bisa dikosongkan)"
                  className="h-10 rounded-xl border border-[#dbe5df] px-3 text-sm focus:border-[#198760] focus:ring-2 focus:ring-[#198760]/20"
                />
                <span className="text-[10px] font-normal text-[#627069]">
                  Kosongkan jika ingin memilih kontak langsung di daftar chat WhatsApp Anda.
                </span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 rounded-xl border border-[#dfe8e3] py-2 text-xs font-bold text-[#627069] hover:bg-[#f7faf8]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  className="flex-[2] flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2 text-xs font-bold text-white shadow-xs hover:bg-[#20ba59] transition"
                >
                  <Send className="size-3.5" />
                  <span>Buka WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
