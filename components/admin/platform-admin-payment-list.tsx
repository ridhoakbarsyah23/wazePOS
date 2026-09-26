import Link from "next/link";
import { ChevronLeft, ChevronRight, CreditCard, Download, ListFilter, Search } from "lucide-react";
import { PlatformAdminFilterResetButton } from "@/components/admin/platform-admin-filter-reset-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPageNumbers, pageDisabledClass, pageLinkClass } from "@/shared/pagination";
import type {
  PlatformAdminPaymentItem,
  PlatformAdminPaymentSummary,
} from "@/shared/admin/platform-admin-types";
import { cn } from "@/shared/utils";

export type PlatformAdminPaymentListFilters = {
  query: string;
  status: string;
  plan: string;
};

type Pagination = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  from: number;
  to: number;
};

const paymentMeta: Record<PlatformAdminPaymentItem["status"], { label: string; variant: "default" | "secondary" | "warning" | "destructive" | "outline" }> = {
  paid: { label: "Berhasil", variant: "default" },
  pending: { label: "Pending", variant: "warning" },
  failed: { label: "Gagal", variant: "destructive" },
  expired: { label: "Kedaluwarsa", variant: "outline" },
  refunded: { label: "Dikembalikan", variant: "secondary" },
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getDate(value: Date | string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value: Date | string | null) {
  const date = getDate(value);
  if (!date) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DateTimeValue({ value }: { value: Date | string | null }) {
  const date = getDate(value);
  if (!date) return <>-</>;
  return <time dateTime={date.toISOString()}>{formatDateTime(value)}</time>;
}

function addFilterParams(params: URLSearchParams, filters: PlatformAdminPaymentListFilters) {
  if (filters.query) params.set("q", filters.query);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.plan && filters.plan !== "all") params.set("plan", filters.plan);
}

function buildPageHref(page: number, filters: PlatformAdminPaymentListFilters, basePath: string) {
  const params = new URLSearchParams();
  addFilterParams(params, filters);
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

function buildExportHref(filters: PlatformAdminPaymentListFilters) {
  const params = new URLSearchParams();
  addFilterParams(params, filters);
  const query = params.toString();
  return query ? `/api/admin/payments/export?${query}` : "/api/admin/payments/export";
}

export function PlatformAdminPaymentList({
  payments,
  filters,
  summary,
  pagination,
  basePath = "/admin/payments",
}: {
  payments: PlatformAdminPaymentItem[];
  filters: PlatformAdminPaymentListFilters;
  summary: PlatformAdminPaymentSummary;
  pagination: Pagination;
  basePath?: string;
}) {
  const hasFilters = Boolean(filters.query || (filters.status && filters.status !== "all") || (filters.plan && filters.plan !== "all"));

  return (
    <section
      aria-labelledby="payment-list-title"
      className="mt-6 overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_24px_rgba(16,65,48,.05)] sm:mt-7"
    >
      <div className="flex flex-col gap-4 border-b border-[#e8efeb] p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="payment-list-title" className="m-0 flex items-center gap-2 text-lg font-black">
              <CreditCard className="size-4 text-[#198760]" aria-hidden="true" />
              Daftar pembayaran
            </h2>
            <span aria-live="polite" className="rounded-full bg-[#eef6f2] px-2.5 py-1 text-[11px] font-extrabold text-[#527066]">
              {pagination.total} data
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#627069]">
            Menampilkan {pagination.from}–{pagination.to} dari {pagination.total} pembayaran, maksimal {pagination.pageSize} per halaman.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 lg:w-[620px] lg:items-end">
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button asChild variant="outline" size="sm" className="h-9 gap-2 px-3 text-xs [&_svg]:size-3.5">
              <a href={buildExportHref(filters)} download>
                <Download aria-hidden="true" />
                Export CSV
              </a>
            </Button>
            <PlatformAdminFilterResetButton formId="platform-admin-payment-filters" basePath={basePath} />
          </div>
          <form
            id="platform-admin-payment-filters"
            key={JSON.stringify(filters)}
            className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:items-center"
            action={basePath}
            method="get"
            role="search"
            aria-label="Filter pembayaran"
          >
            <label className="relative col-span-2 min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#82928a]" aria-hidden="true" />
              <span className="sr-only">Cari usaha, email, atau order id</span>
              <input
                name="q"
                defaultValue={filters.query}
                maxLength={100}
                placeholder="Cari usaha, email, atau order id"
                className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 sm:h-10"
              />
            </label>
            <select
              name="status"
              defaultValue={filters.status}
              aria-label="Filter status pembayaran"
              className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 sm:h-10"
            >
              <option value="all">Semua status</option>
              <option value="pending">Pending</option>
              <option value="paid">Berhasil</option>
              <option value="failed">Gagal</option>
              <option value="expired">Kedaluwarsa</option>
              <option value="refunded">Dikembalikan</option>
            </select>
            <select
              name="plan"
              defaultValue={filters.plan}
              aria-label="Filter paket"
              className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 sm:h-10"
            >
              <option value="all">Semua paket</option>
              <option value="tumbuh">Tumbuh</option>
              <option value="bisnis">Bisnis</option>
            </select>
            <Button type="submit" size="sm" className="col-span-2 h-11 w-full gap-2 px-3 text-xs sm:h-10 sm:col-span-4 [&_svg]:size-3.5">
              <ListFilter aria-hidden="true" />
              Terapkan
            </Button>
          </form>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="px-5 py-14 text-center text-sm text-[#627069]" role="status">
          {hasFilters
            ? "Tidak ada pembayaran yang cocok dengan pencarian atau filter."
            : "Belum ada pembayaran yang tercatat."}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto xl:block" role="region" aria-label="Tabel pembayaran" tabIndex={0}>
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <caption className="sr-only">Daftar pembayaran langganan</caption>
              <thead className="bg-[#f7faf8] text-[11px] uppercase tracking-[0.08em] text-[#627069]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-extrabold">Usaha</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Nominal</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Status</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Order ID</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Paket</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Dibuat</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Dibayar</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((item) => {
                  const meta = paymentMeta[item.status];
                  return (
                    <tr key={item.id} className="border-t border-[#edf2ef] align-top transition hover:bg-[#fbfdfc]">
                      <th scope="row" className="max-w-[240px] px-5 py-4 text-left font-normal">
                        <p className="m-0 truncate font-extrabold" title={item.businessName}>{item.businessName}</p>
                        <p className="mt-1 truncate text-xs text-[#627069]" title={item.ownerEmail ?? undefined}>
                          {item.ownerEmail ?? "Email belum tersedia"}
                        </p>
                      </th>
                      <td className="whitespace-nowrap px-5 py-4 font-extrabold tabular-nums">{formatRupiah(item.amount)}</td>
                      <td className="px-5 py-4">
                        <Badge className="whitespace-nowrap" variant={meta.variant}>{meta.label}</Badge>
                      </td>
                      <td className="max-w-[220px] px-5 py-4">
                        <p className="m-0 truncate font-mono text-xs" title={item.providerOrderId}>{item.providerOrderId}</p>
                        <p className="mt-1 truncate text-xs text-[#627069]">{item.provider}{item.providerPaymentType ? ` · ${item.providerPaymentType}` : ""}</p>
                      </td>
                      <td className="px-5 py-4 font-bold capitalize">{item.plan}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#4d5e57]"><DateTimeValue value={item.createdAt} /></td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#4d5e57]"><DateTimeValue value={item.paidAt} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-[#edf2ef] xl:hidden">
            {payments.map((item) => {
              const meta = paymentMeta[item.status];
              return (
                <article key={item.id} className="p-4 sm:p-5">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="m-0 truncate text-sm font-extrabold" title={item.businessName}>{item.businessName}</h3>
                      <p className="mt-1 truncate font-mono text-xs text-[#627069]" title={item.providerOrderId}>{item.providerOrderId}</p>
                    </div>
                    <Badge className="shrink-0" variant={meta.variant}>{meta.label}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="m-0 text-sm font-black tabular-nums">{formatRupiah(item.amount)}</p>
                    <p className="m-0 text-xs capitalize text-[#627069]">{item.plan}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-[#82928a]">{formatDateTime(item.paidAt ?? item.createdAt)}</p>
                </article>
              );
            })}
          </div>
        </>
      )}

      {pagination.totalPages > 1 && (
        <nav className="flex flex-wrap items-center gap-1.5 border-t border-[#e8efeb] px-4 py-3 sm:px-5" aria-label="Navigasi halaman pembayaran">
          {pagination.page > 1 ? (
            <Link href={buildPageHref(pagination.page - 1, filters, basePath)} className={cn(pageLinkClass, "gap-1.5")}>
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              Sebelumnya
            </Link>
          ) : (
            <span className={pageDisabledClass}>
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              Sebelumnya
            </span>
          )}
          {getPageNumbers(pagination.page, pagination.totalPages).map((item, index) =>
            item === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="px-1 text-xs text-[#82928a]" aria-hidden="true">…</span>
            ) : (
              <Link
                key={item}
                href={buildPageHref(item, filters, basePath)}
                className={cn(
                  pageLinkClass,
                  item === pagination.page && "border-[#198760] bg-[#198760] text-white hover:bg-[#147554] hover:text-white",
                )}
                aria-current={item === pagination.page ? "page" : undefined}
              >
                {item}
              </Link>
            ),
          )}
          {pagination.page < pagination.totalPages ? (
            <Link href={buildPageHref(pagination.page + 1, filters, basePath)} className={cn(pageLinkClass, "gap-1.5")}>
              Berikutnya
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <span className={pageDisabledClass}>
              Berikutnya
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </span>
          )}
        </nav>
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#e8efeb] px-4 py-3 text-xs text-[#627069] sm:px-5">
        <span>Pending: <strong>{summary.pendingPayments}</strong></span>
        <span>Berhasil: <strong>{summary.paidPayments}</strong></span>
        <span>Pendapatan: <strong>{formatRupiah(summary.paidRevenue)}</strong></span>
        <span className="ml-auto hidden text-[#82928a] sm:inline">Urutan terbaru lebih dulu</span>
      </div>
    </section>
  );
}
