export function escapeCsvValue(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  const normalized = /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw;
  return /[",\n\r]/.test(normalized) ? `"${normalized.replaceAll('"', '""')}"` : normalized;
}

export function formatCsvDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function buildCsvResponse(header: string[], rows: (string | number | null | undefined)[][], filename: string, truncated: boolean) {
  const csv = [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\r\n");

  return new Response(`\uFEFF${csv}\r\n`, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...(truncated ? { "X-Export-Truncated": "true" } : {}),
    },
  });
}
