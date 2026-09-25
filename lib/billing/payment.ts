/**
 * Label metode pembayaran dalam bahasa Indonesia.
 * Modul ini bebas dependensi Node — aman dipakai di client components
 * (struk modal, share WhatsApp) maupun server (Riwayat, Laporan, export).
 */

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  debit: "Kartu Debit",
  credit: "Kartu Kredit",
};

export function paymentLabel(method: string) {
  return PAYMENT_METHOD_LABELS[method.toLowerCase()] ?? method;
}
