import type { Cell, SheetData } from "write-excel-file/node";

import { paymentLabel } from "@/lib/payment";

export { paymentLabel };

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
  voidReason?: string | null;
  createdAt: Date | string;
};

export function dateKeyInJakarta(date: Date) {
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

function startOfJakartaDay(dateKey: string) {
  const parsed = parseDateKey(dateKey)!;
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day) - JAKARTA_OFFSET_MS);
}

export function getReportDayRange(value?: string, now = new Date()) {
  const fallbackDateKey = dateKeyInJakarta(now);
  const dateKey = parseDateKey(value) ? value! : fallbackDateKey;
  const start = startOfJakartaDay(dateKey);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { dateKey, start, end };
}

export function getReportDateRange(fromValue?: string, toValue?: string, now = new Date()) {
  const fallbackDateKey = dateKeyInJakarta(now);
  let fromKey = parseDateKey(fromValue) ? fromValue! : fallbackDateKey;
  let toKey = parseDateKey(toValue) ? toValue! : fromKey;

  if (fromKey > toKey) {
    [fromKey, toKey] = [toKey, fromKey];
  }

  const start = startOfJakartaDay(fromKey);
  const end = new Date(startOfJakartaDay(toKey).getTime() + 24 * 60 * 60 * 1000);

  return { fromKey, toKey, start, end };
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

export function formatReportRange(fromKey: string, toKey: string) {
  if (fromKey === toKey) return formatReportDay(fromKey);

  const from = parseDateKey(fromKey)!;
  const to = parseDateKey(toKey)!;
  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `${formatter.format(new Date(Date.UTC(from.year, from.month - 1, from.day, 12)))}–${formatter.format(new Date(Date.UTC(to.year, to.month - 1, to.day, 12)))}`;
}

function protectSpreadsheetFormula(value: string) {
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number) {
  const normalized = typeof value === "string" ? protectSpreadsheetFormula(value) : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

export async function createSalesReportWorkbook({
  rows,
  businessName,
  periodLabel,
  outletLabel,
  paymentFilter,
  statusFilter,
}: {
  rows: SalesReportRow[];
  businessName: string;
  periodLabel: string;
  outletLabel: string;
  paymentFilter: string;
  statusFilter: string;
}) {
  const completedRows = rows.filter((row) => row.status === "completed");
  const voidedRows = rows.filter((row) => row.status === "voided");
  const currencyCell = (value: number): Cell => ({ value, type: Number, format: '"Rp" #,##0' });
  const labelCell = (value: string): Cell => ({ value, fontWeight: "bold" });
  const summaryData: SheetData = [
    [{
      value: "Laporan Penjualan wazePOS",
      columnSpan: 2,
      fontWeight: "bold",
      fontSize: 16,
      textColor: "#FFFFFF",
      backgroundColor: "#187C59",
      height: 30,
      alignVertical: "center",
    }],
    [labelCell("Nama usaha"), protectSpreadsheetFormula(businessName)],
    [labelCell("Periode"), periodLabel],
    [labelCell("Gerai"), protectSpreadsheetFormula(outletLabel)],
    [labelCell("Metode pembayaran"), paymentFilter],
    [labelCell("Status transaksi"), statusFilter],
    [],
    [labelCell("Transaksi berhasil"), completedRows.length],
    [labelCell("Transaksi dibatalkan"), voidedRows.length],
    [labelCell("Subtotal"), currencyCell(completedRows.reduce((sum, row) => sum + Number(row.subtotal), 0))],
    [labelCell("Diskon"), currencyCell(completedRows.reduce((sum, row) => sum + Number(row.discount), 0))],
    [labelCell("Omzet bersih"), currencyCell(completedRows.reduce((sum, row) => sum + Number(row.total), 0))],
  ];

  const detailHeaders = [
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
    "Alasan Pembatalan",
  ].map<Cell>((value) => ({
    value,
    fontWeight: "bold",
    textColor: "#FFFFFF",
    backgroundColor: "#187C59",
    height: 24,
    alignVertical: "center",
  }));

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

  const detailRows: SheetData = rows.map((row, index) => {
    const createdAt = new Date(row.createdAt);
    const backgroundColor = index % 2 === 1 ? "#F4F8F6" : undefined;
    const cell = (value: string | number, format?: string): Cell => ({
      value,
      ...(typeof value === "number" ? { type: Number } : {}),
      ...(format ? { format } : {}),
      ...(backgroundColor ? { backgroundColor } : {}),
    });
    return [
      cell(dateFormatter.format(createdAt)),
      cell(timeFormatter.format(createdAt)),
      cell(protectSpreadsheetFormula(row.invoiceNumber)),
      cell(protectSpreadsheetFormula(row.outletName)),
      cell(paymentLabel(row.paymentMethod)),
      cell(row.status === "completed" ? "Selesai" : "Dibatalkan"),
      cell(Number(row.subtotal), '"Rp" #,##0'),
      cell(Number(row.discount), '"Rp" #,##0'),
      cell(Number(row.total), '"Rp" #,##0'),
      cell(Number(row.paidAmount), '"Rp" #,##0'),
      cell(Number(row.changeAmount), '"Rp" #,##0'),
      cell(protectSpreadsheetFormula(row.voidReason ?? "")),
    ];
  });

  const { default: writeXlsxFile } = await import("write-excel-file/node");

  return writeXlsxFile([
    {
      data: summaryData,
      sheet: "Ringkasan",
      showGridLines: false,
      columns: [{ width: 28 }, { width: 24 }],
    },
    {
      data: [detailHeaders, ...detailRows],
      sheet: "Detail Transaksi",
      stickyRowsCount: 1,
      columns: [
        { width: 14 }, { width: 12 }, { width: 24 }, { width: 24 },
        { width: 20 }, { width: 16 }, { width: 16 }, { width: 14 },
        { width: 16 }, { width: 18 }, { width: 16 }, { width: 34 },
      ],
    },
  ]).toBuffer();
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
