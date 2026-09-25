export type CartLine = {
  sellingPrice: number;
  quantity: number;
};

export type PaymentMethod = "cash" | "qris" | "debit" | "credit";

export function calculateCartTotal(items: CartLine[]) {
  return items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
}

export function calculatePayment(total: number, paymentMethod: PaymentMethod, rawPaidAmount: string) {
  const paid = paymentMethod === "cash" ? Number(rawPaidAmount) || 0 : total;

  return {
    paid,
    change: paymentMethod === "cash" ? Math.max(0, paid - total) : 0,
    shortfall: Math.max(0, total - paid),
  };
}

export function getQuickCashOptions(total: number) {
  if (total <= 0) return [];

  const suggestions = new Set<number>([total]);
  const standardPresets = [10_000, 20_000, 50_000, 100_000, 200_000, 500_000];

  for (const preset of standardPresets) {
    if (preset > total) suggestions.add(preset);
  }

  const nextTen = Math.ceil(total / 10_000) * 10_000;
  if (nextTen > total) suggestions.add(nextTen);

  const nextFifty = Math.ceil(total / 50_000) * 50_000;
  if (nextFifty > total) suggestions.add(nextFifty);

  return Array.from(suggestions)
    .filter((value) => value >= total)
    .sort((a, b) => a - b)
    .slice(0, 4);
}
