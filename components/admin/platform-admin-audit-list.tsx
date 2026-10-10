import Link from "next/link";
import { ChevronLeft, ChevronRight, History, ListFilter, Search } from "lucide-react";
import { PlatformAdminFilterResetButton } from "@/components/admin/platform-admin-filter-reset-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPageNumbers, pageDisabledClass, pageLinkClass } from "@/shared/pagination";
import type { PlatformAdminAuditLogItem } from "@/shared/admin/platform-admin-types";
import { cn } from "@/shared/utils";

export type PlatformAdminAuditListFilters = {
  query: string;
  action: string;
};

type Pagination = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  from: number;
  to: number;
};

function getActionLabel(action: string) {
  if (action === "business_follow_up_created") return "Tindak lanjut dicatat";
  if (action === "business_detail_view") return "Detail usaha dibuka";
  if (action === "business_export") return "Daftar usaha diekspor";
  if (action === "subscription_export") return "Langganan diekspor";
  if (action === "payment_export") return "Pembayaran diekspor";
  if (action === "payment_verified") return "Pembayaran diverifikasi";
  if (action === "payment_disbursed") return "Pembayaran dicairkan";
  return action;
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

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function DateTimeValue({ value }: { value: Date | string | null }) {
  const date = getDate(value);
  if (!date) return <>-</>;
  return <time dateTime={date.toISOString()}>{formatDateTime(value)}</time>;
}

function getMetadataString(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getMetadataNumber(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getDecisionLabel(value: string | null) {
  if (value === "approve") return "Disetujui";
  if (value === "reject") return "Ditolak";
  return value;
}

function AuditMetadata({ item }: { item: PlatformAdminAuditLogItem }) {
  if (item.action !== "payment_verified" && item.action !== "payment_disbursed") return null;

  const decision = getDecisionLabel(getMetadataString(item.metadata, "decision"));
  const plan = getMetadataString(item.metadata, "plan");
  const amount = getMetadataNumber(item.metadata, "amount");
  const orderId = getMetadataString(item.metadata, "orderId");
  const reference = getMetadataString(item.metadata, "reference");
  const note = getMetadataString(item.metadata, "note");
  const details = [
    decision ? { label: "Keputusan", value: decision } : null,
    plan ? { label: "Paket", value: plan === "bisnis" ? "wazePOS Bisnis" : "wazePOS Tumbuh" } : null,
    amount !== null ? { label: "Nominal", value: formatRupiah(amount) } : null,
    orderId ? { label: "Order ID", value: orderId } : null,
    reference ? { label: "Referensi", value: reference } : null,
    note ? { label: "Catatan", value: note } : null,
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail));

  if (!details.length) return null;

  return (
    <dl className="mt-3 grid gap-2 rounded-xl border border-[#e8efeb] bg-[#fbfdfc] p-3 text-xs dark:border-[#303030] dark:bg-[#151515] sm:grid-cols-2">
      {details.map((detail) => (
        <div key={`${item.id}-${detail.label}`} className="min-w-0">
          <dt className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#718078] dark:text-[#a3a3a3]">
            {detail.label}
          </dt>
          <dd className="m-0 mt-0.5 break-words font-semibold text-[#15211d] dark:text-white">
            {detail.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function addFilterParams(params: URLSearchParams, filters: PlatformAdminAuditListFilters) {
  if (filters.query) params.set("q", filters.query);
  if (filters.action && filters.action !== "all") params.set("action", filters.action);
}

function buildPageHref(page: number, filters: PlatformAdminAuditListFilters, basePath: string) {
  const params = new URLSearchParams();
  addFilterParams(params, filters);
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

export function PlatformAdminAuditList({
  logs,
  filters,
  pagination,
  auditAvailable,
  basePath = "/admin/audit",
}: {
  logs: PlatformAdminAuditLogItem[];
  filters: PlatformAdminAuditListFilters;
  pagination: Pagination;
  auditAvailable: boolean;
  basePath?: string;
}) {
  const hasFilters = Boolean(filters.query || (filters.action && filters.action !== "all"));

  return (
    <section
      aria-labelledby="audit-list-title"
      className="mt-6 overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_24px_rgba(16,65,48,.05)] dark:border-[#303030] dark:bg-[#0d0d0d] sm:mt-7"
    >
      <div className="flex flex-col gap-4 border-b border-[#e8efeb] p-4 dark:border-[#303030] sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="audit-list-title" className="m-0 flex items-center gap-2 text-lg font-black text-[#15211d] dark:text-white">
              <History className="size-4 text-[#198760] dark:text-[#62d6a5]" aria-hidden="true" />
              Jejak audit
            </h2>
            <span aria-live="polite" className="rounded-full bg-[#eef6f2] px-2.5 py-1 text-[11px] font-extrabold text-[#527066] dark:bg-[#1a1a1a] dark:text-[#a3a3a3]">
              {pagination.total} data
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#627069] dark:text-[#a3a3a3]">
            Menampilkan {pagination.from}–{pagination.to} dari {pagination.total} aktivitas admin, maksimal {pagination.pageSize} per halaman.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 lg:w-[620px] lg:items-end">
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <PlatformAdminFilterResetButton formId="platform-admin-audit-filters" basePath={basePath} />
          </div>
          <form
            id="platform-admin-audit-filters"
            key={JSON.stringify(filters)}
            className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:items-center"
            action={basePath}
            method="get"
            role="search"
            aria-label="Filter jejak audit"
          >
            <label className="relative col-span-2 min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#82928a] dark:text-[#737373]" aria-hidden="true" />
              <span className="sr-only">Cari admin, usaha, atau entity</span>
              <input
                name="q"
                defaultValue={filters.query}
                maxLength={100}
                placeholder="Cari admin, usaha, atau entity"
                className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white pl-9 pr-3 text-sm text-[#15211d] outline-none placeholder:text-[#82928a] transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 dark:border-[#303030] dark:bg-[#101010] dark:text-white dark:placeholder:text-[#737373] sm:h-10"
              />
            </label>
            <select
              name="action"
              defaultValue={filters.action}
              aria-label="Filter aksi audit"
              className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-sm font-semibold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 dark:border-[#303030] dark:bg-[#101010] dark:text-white sm:h-10"
            >
              <option value="all">Semua aksi</option>
              <option value="business_follow_up_created">Tindak lanjut dicatat</option>
              <option value="business_detail_view">Detail usaha dibuka</option>
              <option value="business_export">Daftar usaha diekspor</option>
              <option value="subscription_export">Langganan diekspor</option>
              <option value="payment_export">Pembayaran diekspor</option>
              <option value="payment_verified">Pembayaran diverifikasi</option>
              <option value="payment_disbursed">Pembayaran dicairkan</option>
            </select>
            <Button type="submit" size="sm" className="h-11 w-full gap-2 px-3 text-xs sm:h-10 [&_svg]:size-3.5">
              <ListFilter aria-hidden="true" />
              Terapkan
            </Button>
          </form>
        </div>
      </div>

      {!auditAvailable ? (
        <div className="px-5 py-14 text-center text-sm text-[#627069] dark:text-[#a3a3a3]" role="status">
          Tabel audit belum tersedia di database ini. Jalankan migrasi sebelum membuka halaman audit.
        </div>
      ) : logs.length === 0 ? (
        <div className="px-5 py-14 text-center text-sm text-[#627069] dark:text-[#a3a3a3]" role="status">
          {hasFilters
            ? "Tidak ada aktivitas yang cocok dengan pencarian atau filter."
            : "Belum ada aktivitas admin yang terekam."}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto xl:block" role="region" aria-label="Tabel jejak audit" tabIndex={0}>
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <caption className="sr-only">Jejak aktivitas admin</caption>
              <thead className="bg-[#f7faf8] text-[11px] uppercase tracking-[0.08em] text-[#627069] dark:bg-[#151515] dark:text-[#a3a3a3]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-extrabold">Aksi</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Admin</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Usaha</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Entity</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((item) => (
                  <tr key={item.id} className="border-t border-[#edf2ef] align-top transition hover:bg-[#fbfdfc] dark:border-[#303030] dark:hover:bg-[#151515]">
                    <th scope="row" className="max-w-[260px] px-5 py-4 text-left font-normal">
                      <p className="m-0 font-extrabold text-[#15211d] dark:text-white">{getActionLabel(item.action)}</p>
                      <p className="mt-1 font-mono text-[11px] text-[#82928a] dark:text-[#a3a3a3]">{item.action}</p>
                      <AuditMetadata item={item} />
                    </th>
                    <td className="max-w-[220px] px-5 py-4">
                      <p className="m-0 truncate font-semibold text-[#15211d] dark:text-white" title={item.actorName ?? undefined}>{item.actorName ?? "-"}</p>
                      <p className="mt-1 truncate text-xs text-[#627069] dark:text-[#a3a3a3]" title={item.actorEmail}>{item.actorEmail}</p>
                    </td>
                    <td className="max-w-[220px] px-5 py-4">
                      <p className="m-0 truncate font-semibold text-[#15211d] dark:text-white">{item.businessName ?? "-"}</p>
                      <p className="mt-1 truncate font-mono text-[11px] text-[#82928a] dark:text-[#a3a3a3]">{item.businessId ?? item.entityId ?? "-"}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-[#4d5e57] dark:text-[#d4d4d4]">
                      <Badge variant="outline">{item.entityType}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-[#4d5e57] dark:text-[#d4d4d4]">
                      <DateTimeValue value={item.createdAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-[#edf2ef] dark:divide-[#303030] xl:hidden">
            {logs.map((item) => (
              <article key={item.id} className="p-4 dark:[&>p]:text-[#a3a3a3] sm:p-5">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="m-0 truncate text-sm font-extrabold text-[#15211d] dark:text-white">{getActionLabel(item.action)}</h3>
                    <p className="mt-1 truncate text-xs text-[#627069] dark:text-[#a3a3a3]">{item.actorName ?? item.actorEmail}</p>
                  </div>
                  <Badge className="shrink-0" variant="outline">{item.entityType}</Badge>
                </div>
                <AuditMetadata item={item} />
                <p className="mt-2 truncate text-xs text-[#627069]">{item.businessName ?? "Tanpa usaha"} · {formatDateTime(item.createdAt)}</p>
              </article>
            ))}
          </div>
        </>
      )}

      {pagination.totalPages > 1 && (
        <nav className="flex flex-wrap items-center gap-1.5 border-t border-[#e8efeb] px-4 py-3 dark:border-[#303030] dark:[&_span]:text-[#a3a3a3] sm:px-5" aria-label="Navigasi halaman audit">
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
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#e8efeb] px-4 py-3 text-xs text-[#627069] dark:border-[#303030] dark:text-[#a3a3a3] sm:px-5">
        <span>Sumber: tabel platform_admin_audit_log</span>
        <span className="ml-auto hidden text-[#82928a] dark:text-[#a3a3a3] sm:inline">Urutan terbaru lebih dulu</span>
      </div>
    </section>
  );
}
