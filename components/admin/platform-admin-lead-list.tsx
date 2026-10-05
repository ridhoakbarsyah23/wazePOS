import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Inbox,
  ListFilter,
  MessageSquareText,
  Search,
} from "lucide-react";
import { PlatformAdminFilterResetButton } from "@/components/admin/platform-admin-filter-reset-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPageNumbers, pageDisabledClass, pageLinkClass } from "@/shared/pagination";
import type {
  PlatformAdminLeadFilters,
  PlatformAdminLeadItem,
  PlatformAdminLeadSummary,
} from "@/shared/admin/platform-admin-types";
import { cn } from "@/shared/utils";

type Pagination = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  from: number;
  to: number;
};

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

function addFilterParams(params: URLSearchParams, filters: PlatformAdminLeadFilters) {
  if (filters.query) params.set("q", filters.query);
  if (filters.source) params.set("source", filters.source);
  if (filters.createdFrom) params.set("createdFrom", filters.createdFrom);
  if (filters.createdTo) params.set("createdTo", filters.createdTo);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
}

function buildPageHref(page: number, filters: PlatformAdminLeadFilters, basePath: string) {
  const params = new URLSearchParams();
  addFilterParams(params, filters);
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

function buildWhatsAppHref(whatsapp: string) {
  const digits = whatsapp.replace(/[^\d]/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

function formatSource(source: string) {
  return source
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function LeadMessage({ message }: { message: string | null }) {
  if (!message) return <span className="text-[#82928a]">Tidak ada pesan</span>;
  return <span className="line-clamp-2 break-words">{message}</span>;
}

export function PlatformAdminLeadList({
  leads,
  filters,
  summary,
  pagination,
  basePath = "/admin/leads",
}: {
  leads: PlatformAdminLeadItem[];
  filters: PlatformAdminLeadFilters;
  summary: PlatformAdminLeadSummary;
  pagination: Pagination;
  basePath?: string;
}) {
  const hasFilters = Boolean(filters.query || filters.source || filters.createdFrom || filters.createdTo || filters.sort !== "newest");

  return (
    <section
      aria-labelledby="lead-list-title"
      className="mt-6 overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_24px_rgba(16,65,48,.05)] sm:mt-7"
    >
      <div className="flex flex-col gap-4 border-b border-[#e8efeb] p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="lead-list-title" className="m-0 flex items-center gap-2 text-lg font-black">
              <Inbox className="size-4 text-[#198760]" aria-hidden="true" />
              Daftar lead
            </h2>
            <span aria-live="polite" className="rounded-full bg-[#eef6f2] px-2.5 py-1 text-[11px] font-extrabold text-[#527066]">
              {pagination.total} data
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#627069]">
            Menampilkan {pagination.from}-{pagination.to} dari {pagination.total} lead, maksimal {pagination.pageSize} per halaman.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 lg:w-[760px] lg:items-end">
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <PlatformAdminFilterResetButton formId="platform-admin-lead-filters" basePath={basePath} />
          </div>
          <form
            id="platform-admin-lead-filters"
            key={JSON.stringify(filters)}
            className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-6 sm:items-center"
            action={basePath}
            method="get"
            role="search"
            aria-label="Filter lead"
          >
            <label className="relative col-span-2 min-w-0 sm:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#82928a]" aria-hidden="true" />
              <span className="sr-only">Cari nama, WhatsApp, bisnis, jenis usaha, atau pesan</span>
              <input
                name="q"
                defaultValue={filters.query}
                maxLength={100}
                placeholder="Cari lead atau bisnis"
                className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 sm:h-10"
              />
            </label>
            <input
              name="source"
              defaultValue={filters.source}
              maxLength={50}
              aria-label="Filter sumber lead"
              placeholder="Sumber"
              className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-sm outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 sm:h-10"
            />
            <input
              name="createdFrom"
              defaultValue={filters.createdFrom}
              type="date"
              aria-label="Lead dari tanggal"
              className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-sm outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 sm:h-10"
            />
            <input
              name="createdTo"
              defaultValue={filters.createdTo}
              type="date"
              aria-label="Lead sampai tanggal"
              className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-sm outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 sm:h-10"
            />
            <select
              name="sort"
              defaultValue={filters.sort}
              aria-label="Urutkan lead"
              className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 sm:h-10"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="name_asc">Nama A-Z</option>
            </select>
            <Button type="submit" size="sm" className="col-span-2 h-11 w-full gap-2 px-3 text-xs sm:col-span-6 sm:h-10 [&_svg]:size-3.5">
              <ListFilter aria-hidden="true" />
              Terapkan
            </Button>
          </form>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="px-5 py-14 text-center text-sm text-[#627069]" role="status">
          {hasFilters ? "Tidak ada lead yang cocok dengan pencarian atau filter." : "Belum ada lead yang masuk."}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto xl:block" role="region" aria-label="Tabel lead" tabIndex={0}>
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <caption className="sr-only">Daftar lead marketing wazePOS</caption>
              <thead className="bg-[#f7faf8] text-[11px] uppercase tracking-[0.08em] text-[#627069]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-extrabold">Kontak</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Usaha</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Pesan</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Sumber</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Webhook</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Masuk</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((item) => {
                  const whatsappHref = buildWhatsAppHref(item.whatsapp);
                  return (
                    <tr key={item.id} className="border-t border-[#edf2ef] align-top transition hover:bg-[#fbfdfc]">
                      <th scope="row" className="max-w-[220px] px-5 py-4 text-left font-normal">
                        <p className="m-0 truncate font-extrabold" title={item.name}>{item.name}</p>
                        <p className="mt-1 truncate text-xs text-[#627069]" title={item.whatsapp}>{item.whatsapp}</p>
                      </th>
                      <td className="max-w-[240px] px-5 py-4">
                        <p className="m-0 truncate font-bold" title={item.businessName}>{item.businessName}</p>
                        <p className="mt-1 truncate text-xs text-[#627069]">{item.businessType} - {item.outlets} gerai</p>
                      </td>
                      <td className="max-w-[300px] px-5 py-4 text-[#4d5e57]">
                        <LeadMessage message={item.message} />
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="secondary">{formatSource(item.source)}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        {item.webhookDeliveredAt ? (
                          <Badge variant="default">Terkirim</Badge>
                        ) : (
                          <Badge variant="outline">Database</Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#4d5e57]"><DateTimeValue value={item.createdAt} /></td>
                      <td className="px-5 py-4">
                        {whatsappHref ? (
                          <Button asChild variant="outline" size="sm" className="h-9 gap-2 px-3 text-xs [&_svg]:size-3.5">
                            <a href={whatsappHref} target="_blank" rel="noreferrer">
                              <MessageSquareText aria-hidden="true" />
                              WhatsApp
                              <ExternalLink aria-hidden="true" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-[#82928a]">Nomor tidak valid</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-[#edf2ef] xl:hidden">
            {leads.map((item) => {
              const whatsappHref = buildWhatsAppHref(item.whatsapp);
              return (
                <article key={item.id} className="p-4 sm:p-5">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="m-0 truncate text-sm font-extrabold" title={item.name}>{item.name}</h3>
                      <p className="mt-1 truncate text-xs text-[#627069]" title={item.whatsapp}>{item.whatsapp}</p>
                    </div>
                    <Badge className="shrink-0" variant={item.webhookDeliveredAt ? "default" : "outline"}>
                      {item.webhookDeliveredAt ? "Terkirim" : "Database"}
                    </Badge>
                  </div>
                  <p className="mt-3 m-0 text-sm font-bold">{item.businessName}</p>
                  <p className="mt-1 text-xs text-[#627069]">{item.businessType} - {item.outlets} gerai</p>
                  <p className="mt-3 text-sm leading-6 text-[#4d5e57]"><LeadMessage message={item.message} /></p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-[#82928a]">{formatDateTime(item.createdAt)}</span>
                    {whatsappHref && (
                      <Button asChild variant="outline" size="sm" className="h-9 gap-2 px-3 text-xs [&_svg]:size-3.5">
                        <a href={whatsappHref} target="_blank" rel="noreferrer">
                          <MessageSquareText aria-hidden="true" />
                          WhatsApp
                        </a>
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {pagination.totalPages > 1 && (
        <nav className="flex flex-wrap items-center gap-1.5 border-t border-[#e8efeb] px-4 py-3 sm:px-5" aria-label="Navigasi halaman lead">
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
              <span key={`ellipsis-${index}`} className="px-1 text-xs text-[#82928a]" aria-hidden="true">...</span>
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
        <span>Total lead: <strong>{summary.total}</strong></span>
        <span>Masuk hari ini: <strong>{summary.today}</strong></span>
        <span>Webhook terkirim: <strong>{summary.webhookDelivered}</strong></span>
        <span className="ml-auto hidden text-[#82928a] sm:inline">Urutan terbaru lebih dulu</span>
      </div>
    </section>
  );
}
