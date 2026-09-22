export const PAGE_SIZE = 25;

export const pageLinkClass =
  "inline-flex h-8 items-center rounded-lg border border-[#dbe5df] bg-white px-3 text-xs font-semibold text-[#52645c] transition hover:border-[#187c59] hover:text-[#187c59]";
export const pageDisabledClass =
  "inline-flex h-8 items-center rounded-lg border border-[#dbe5df] bg-white px-3 text-xs font-semibold text-[#52645c] opacity-40";

/**
 * Menghasilkan daftar nomor halaman untuk navigasi pagination.
 * Halaman pertama, terakhir, dan sekitar halaman aktif selalu tampil;
 * sisa jarak direpresentasikan sebagai "ellipsis".
 */
export function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  const safeTotal = Math.max(total, 1);
  const safeCurrent = Math.min(Math.max(current, 1), safeTotal);

  if (safeTotal <= 7) return Array.from({ length: safeTotal }, (_, index) => index + 1);

  const selected = new Set<number>([
    1,
    safeTotal,
    safeCurrent - 1,
    safeCurrent,
    safeCurrent + 1,
  ]);
  if (safeCurrent <= 3) selected.add(3);
  if (safeCurrent >= safeTotal - 2) selected.add(safeTotal - 1);

  const output: (number | "ellipsis")[] = [];
  let previous = 0;
  for (const value of [...selected]
    .filter((item) => item >= 1 && item <= safeTotal)
    .sort((a, b) => a - b)) {
    if (value - previous > 1) output.push("ellipsis");
    output.push(value);
    previous = value;
  }
  return output;
}
