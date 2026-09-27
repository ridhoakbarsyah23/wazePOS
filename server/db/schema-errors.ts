/**
 * Deteksi error skema database yang belum dimigrasi di production.
 * Vercel build tidak menjalankan migrasi otomatis, sehingga tabel/kolom baru
 * (mis. `cash_expense`) bisa belum ada saat kode baru sudah ter-deploy.
 * Halaman harus fallback ke data kosong, bukan melempar ke error boundary.
 */
export function isMissingSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const stack: unknown[] = [error];
  const messages: string[] = [];
  let code: string | null = null;
  while (stack.length > 0) {
    const current = stack.pop() as Record<string, unknown> | null;
    if (!current || typeof current !== "object") continue;
    if (typeof current.code === "string" && !code) code = current.code;
    if (typeof current.message === "string") messages.push(current.message);
    for (const key of ["cause", "error", "inner"]) {
      const nested = (current as Record<string, unknown>)[key];
      if (nested && typeof nested === "object") stack.push(nested);
    }
  }
  // 42P01 = undefined_table, 42703 = undefined_column
  if (code === "42P01" || code === "42703") return true;
  const haystack = messages.join(" ").toLowerCase();
  return (
    haystack.includes("does not exist") ||
    haystack.includes("undefined_table") ||
    haystack.includes("undefined_column") ||
    haystack.includes('relation "cash_expense"') ||
    haystack.includes('relation "public.cash_expense"')
  );
}
