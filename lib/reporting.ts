const REPORT_TIME_ZONE = "Asia/Jakarta";
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

export type SalesReportRow = {
  invoiceNumber: string;
  outletName: string;
  paymentMethod: string;
  status: "completed" | "voided";
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  createdAt: Date | string;
};

function dateKeyInJakarta(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parseDateKey(value: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const validationDate = new Date(Date.UTC(year, month - 1, day));
  if (
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() !== month - 1 ||
    validationDate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function getReportDayRange(value?: string, now = new Date()) {
  const fallbackDateKey = dateKeyInJakarta(now);
  const dateKey = parseDateKey(value) ? value! : fallbackDateKey;
  const parsed = parseDateKey(dateKey)!;
  const start = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day) - JAKARTA_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { dateKey, start, end };
}

export function formatReportDay(dateKey: string) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: REPORT_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12)));
}

function protectSpreadsheetFormula(value: string) {
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number) {
  const normalized = typeof value === "string" ? protectSpreadsheetFormula(value) : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

function paymentLabel(method: string) {
  const labels: Record<string, string> = {
    cash: "Tunai",
    qris: "QRIS",
    debit: "Kartu Debit",
    credit: "Kartu Kredit",
  };
  return labels[method.toLowerCase()] ?? method;
}

export function createSalesReportCsv(rows: SalesReportRow[]) {
  const dateFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: REPORT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const headers = [
    "Tanggal",
    "Waktu",
    "No. Invoice",
    "Gerai",
    "Metode Pembayaran",
    "Status",
    "Subtotal",
    "Diskon",
    "Total",
    "Uang Diterima",
    "Kembalian",
  ];
  const lines = [
    headers.map(csvCell).join(";"),
    ...rows.map((row) => {
      const createdAt = new Date(row.createdAt);
      return [
        dateFormatter.format(createdAt),
        timeFormatter.format(createdAt),
        row.invoiceNumber,
        row.outletName,
        paymentLabel(row.paymentMethod),
        row.status === "completed" ? "Selesai" : "Dibatalkan",
        row.subtotal,
        row.discount,
        row.total,
        row.paidAmount,
        row.changeAmount,
      ]
        .map(csvCell)
        .join(";");
    }),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}
