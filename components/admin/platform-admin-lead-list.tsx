import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Inbox,
  ListFilter,
  MessageSquareText,
  Search,
} from "lucide-react";
import { PlatformAdminFilterResetButton } from "@/components/admin/platform-admin-filter-reset-button";
import { PlatformAdminLeadFollowUpForm } from "@/components/admin/platform-admin-lead-follow-up-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPageNumbers, pageDisabledClass, pageLinkClass } from "@/shared/pagination";
import { leadStatusLabels, type LeadStatus } from "@/shared/admin/platform-admin-leads";
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

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.followUp !== "all") params.set("followUp", filters.followUp);
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

function getLeadStatusVariant(status: LeadStatus) {
  if (status === "interested") return "default";
  if (status === "not_qualified") return "outline";
  return "secondary";
}

function getFollowUpLabel(followUpDate: string | null, businessDate: string) {
  if (!followUpDate) return null;
  if (followUpDate < businessDate) return `Terlewat sejak ${formatDate(followUpDate)}`;
  if (followUpDate === businessDate) return "Follow-up hari ini";
  return `Follow-up ${formatDate(followUpDate)}`;
}

function LeadMessage({ message }: { message: string | null }) {
  if (!message) return <span className="text-[#82928a] dark:text-[#a3a3a3]">Tidak ada pesan</span>;
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
  const hasActiveFilters = Boolean(hasFilters || filters.status !== "all" || filters.followUp !== "all");
  const sortLabel = filters.sort === "oldest" ? "Urutan terlama lebih dulu" : filters.sort === "name_asc" ? "Urutan nama A-Z" : "Urutan terbaru lebih dulu";

  return (
    <section
      aria-labelledby="lead-list-title"
      className="mt-6 overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_24px_rgba(16,65,48,.05)] dark:border-[#303030] dark:bg-[#0d0d0d] sm:mt-7"
    >
      <div className="grid gap-4 border-b border-[#e8efeb] p-4 dark:border-[#303030] sm:p-5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="lead-list-title" className="m-0 flex items-center gap-2 text-lg font-black text-[#15211d] dark:text-white">
                <Inbox className="size-4 text-[#198760]" aria-hidden="true" />
                Daftar lead
              </h2>
              <span aria-live="polite" className="rounded-full bg-[#eef6f2] px-2.5 py-1 text-[11px] font-extrabold text-[#527066] dark:bg-[#1a1a1a] dark:text-[#a3a3a3]">
                {pagination.total} data
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#627069] dark:text-[#a3a3a3]">
              Menampilkan {pagination.from}-{pagination.to} dari {pagination.total} lead, maksimal {pagination.pageSize} per halaman.
            </p>
          </div>
          <div className="flex shrink-0 sm:justify-end">
            <PlatformAdminFilterResetButton formId="platform-admin-lead-filters" basePath={basePath} />
          </div>
        </div>

        <form
          id="platform-admin-lead-filters"
          key={JSON.stringify(filters)}
          className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-12 lg:items-center"
          action={basePath}
          method="get"
          role="search"
          aria-label="Filter lead"
        >
          <label className="relative min-w-0 sm:col-span-2 lg:col-span-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#82928a] dark:text-[#737373]" aria-hidden="true" />
            <span className="sr-only">Cari nama, WhatsApp, bisnis, jenis usaha, atau pesan</span>
            <input
              name="q"
              defaultValue={filters.query}
              maxLength={100}
              placeholder="Cari lead atau bisnis"
              className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white pl-9 pr-3 text-sm text-[#15211d] outline-none transition placeholder:text-[#82928a] focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 dark:border-[#303030] dark:bg-[#101010] dark:text-white dark:placeholder:text-[#737373]"
            />
          </label>
          <input
            name="source"
            defaultValue={filters.source}
            maxLength={50}
            aria-label="Filter sumber lead"
            placeholder="Sumber"
            className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-sm text-[#15211d] outline-none transition placeholder:text-[#82928a] focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 dark:border-[#303030] dark:bg-[#101010] dark:text-white dark:placeholder:text-[#737373] lg:col-span-2"
          />
          <select
            name="status"
            defaultValue={filters.status}
            aria-label="Filter status lead"
            className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-sm font-semibold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 dark:border-[#303030] dark:bg-[#101010] dark:text-white lg:col-span-2"
          >
            <option value="all">Semua status</option>
            {Object.entries(leadStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            name="followUp"
            defaultValue={filters.followUp}
            aria-label="Filter jadwal follow-up"
            className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-sm font-semibold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 dark:border-[#303030] dark:bg-[#101010] dark:text-white lg:col-span-2"
          >
            <option value="all">Semua follow-up</option>
            <option value="due">Perlu follow-up</option>
          </select>
          <select
            name="sort"
            defaultValue={filters.sort}
            aria-label="Urutkan lead"
            className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-sm font-semibold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 dark:border-[#303030] dark:bg-[#101010] dark:text-white lg:col-span-2"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="name_asc">Nama A-Z</option>
          </select>
          <label className="relative min-w-0 lg:col-span-2">
            <span className="sr-only">Lead dari tanggal</span>
            <input
              name="createdFrom"
              defaultValue={filters.createdFrom}
              type="date"
              aria-label="Lead dari tanggal"
              className="date-picker-modern h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 pr-10 text-sm text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 dark:border-[#303030] dark:bg-[#101010] dark:text-white"
            />
            <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#82928a] dark:text-[#62d6a5]" aria-hidden="true" />
          </label>
          <label className="relative min-w-0 lg:col-span-2">
            <span className="sr-only">Lead sampai tanggal</span>
            <input
              name="createdTo"
              defaultValue={filters.createdTo}
              type="date"
              aria-label="Lead sampai tanggal"
              className="date-picker-modern h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 pr-10 text-sm text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 dark:border-[#303030] dark:bg-[#101010] dark:text-white"
            />
            <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#82928a] dark:text-[#62d6a5]" aria-hidden="true" />
          </label>
          <Button type="submit" size="sm" className="h-11 w-full gap-2 px-3 text-xs sm:col-span-2 lg:col-span-3 xl:col-span-2 [&_svg]:size-3.5">
            <ListFilter aria-hidden="true" />
            Terapkan
          </Button>
        </form>
      </div>

      {leads.length === 0 ? (
        <div className="px-5 py-14 text-center text-sm text-[#627069] dark:text-[#a3a3a3]" role="status">
          {hasActiveFilters ? "Tidak ada lead yang cocok dengan pencarian atau filter." : "Belum ada lead yang masuk."}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto xl:block" role="region" aria-label="Tabel lead" tabIndex={0}>
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <caption className="sr-only">Daftar lead marketing wazePOS</caption>
              <thead className="bg-[#f7faf8] text-[11px] uppercase tracking-[0.08em] text-[#627069] dark:bg-[#151515] dark:text-[#a3a3a3]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-extrabold">Kontak</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Usaha</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Pesan</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Status</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Webhook</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Masuk</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((item) => {
                  const whatsappHref = buildWhatsAppHref(item.whatsapp);
                  const followUpLabel = getFollowUpLabel(item.followUpDate, summary.businessDate);
                  const followUpDue = Boolean(item.followUpDate && item.followUpDate <= summary.businessDate && item.status !== "not_qualified");
                  return (
                    <tr key={item.id} className="border-t border-[#edf2ef] align-top transition hover:bg-[#fbfdfc] dark:border-[#303030] dark:hover:bg-[#151515]">
                      <th scope="row" className="max-w-[220px] px-5 py-4 text-left font-normal">
                        <p className="m-0 truncate font-extrabold text-[#15211d] dark:text-white" title={item.name}>{item.name}</p>
                        <p className="mt-1 truncate text-xs text-[#627069] dark:text-[#a3a3a3]" title={item.whatsapp}>{item.whatsapp}</p>
                      </th>
                      <td className="max-w-[240px] px-5 py-4">
                        <p className="m-0 truncate font-bold text-[#15211d] dark:text-white" title={item.businessName}>{item.businessName}</p>
                        <p className="mt-1 truncate text-xs text-[#627069] dark:text-[#a3a3a3]">{item.businessType} - {item.outlets} gerai</p>
                      </td>
                      <td className="max-w-[300px] px-5 py-4 text-[#4d5e57] dark:text-[#d4d4d4]">
                        <LeadMessage message={item.message} />
                        <PlatformAdminLeadFollowUpForm
                          leadId={item.id}
                          initialStatus={item.status}
                          initialNote={item.followUpNote}
                          initialDate={item.followUpDate}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-2">
                          <Badge variant={getLeadStatusVariant(item.status)}>{leadStatusLabels[item.status]}</Badge>
                          {followUpLabel && (
                            <Badge variant={followUpDue ? "default" : "outline"}>{followUpLabel}</Badge>
                          )}
                          <Badge variant="secondary">{formatSource(item.source)}</Badge>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {item.webhookDeliveredAt ? (
                          <Badge variant="default">Terkirim</Badge>
                        ) : (
                          <Badge variant="outline">Database</Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#4d5e57] dark:text-[#d4d4d4]"><DateTimeValue value={item.createdAt} /></td>
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
                          <span className="text-xs text-[#82928a] dark:text-[#a3a3a3]">Nomor tidak valid</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-[#edf2ef] dark:divide-[#303030] xl:hidden">
            {leads.map((item) => {
              const whatsappHref = buildWhatsAppHref(item.whatsapp);
              const followUpLabel = getFollowUpLabel(item.followUpDate, summary.businessDate);
              const followUpDue = Boolean(item.followUpDate && item.followUpDate <= summary.businessDate && item.status !== "not_qualified");
              return (
                <article key={item.id} className="p-4 sm:p-5">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="m-0 truncate text-sm font-extrabold text-[#15211d] dark:text-white" title={item.name}>{item.name}</h3>
                      <p className="mt-1 truncate text-xs text-[#627069] dark:text-[#a3a3a3]" title={item.whatsapp}>{item.whatsapp}</p>
                    </div>
                    <Badge className="shrink-0" variant={item.webhookDeliveredAt ? "default" : "outline"}>
                      {item.webhookDeliveredAt ? "Terkirim" : "Database"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant={getLeadStatusVariant(item.status)}>{leadStatusLabels[item.status]}</Badge>
                    {followUpLabel && (
                      <Badge variant={followUpDue ? "default" : "outline"}>{followUpLabel}</Badge>
                    )}
                    <Badge variant="secondary">{formatSource(item.source)}</Badge>
                  </div>
                  <p className="mt-3 m-0 text-sm font-bold text-[#15211d] dark:text-white">{item.businessName}</p>
                  <p className="mt-1 text-xs text-[#627069] dark:text-[#a3a3a3]">{item.businessType} - {item.outlets} gerai</p>
                  <p className="mt-3 text-sm leading-6 text-[#4d5e57] dark:text-[#d4d4d4]"><LeadMessage message={item.message} /></p>
                  <PlatformAdminLeadFollowUpForm
                    leadId={item.id}
                    initialStatus={item.status}
                    initialNote={item.followUpNote}
                    initialDate={item.followUpDate}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-[#82928a] dark:text-[#a3a3a3]">{formatDateTime(item.createdAt)}</span>
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

      <nav className="flex flex-col gap-3 border-t border-[#e8efeb] px-4 py-3 dark:border-[#303030] sm:flex-row sm:items-center sm:justify-between sm:px-5" aria-label="Navigasi halaman lead">
        <p className="m-0 text-xs font-semibold text-[#627069] dark:text-[#a3a3a3]">
          Halaman {pagination.page} dari {pagination.totalPages} - {pagination.pageSize} data per halaman
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
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
          {pagination.totalPages > 1 ? (
            getPageNumbers(pagination.page, pagination.totalPages).map((item, index) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="px-1 text-xs text-[#82928a] dark:text-[#a3a3a3]" aria-hidden="true">...</span>
              ) : (
                <Link
                  key={item}
                  href={buildPageHref(item, filters, basePath)}
                  className={cn(
                    pageLinkClass,
                    item === pagination.page && "border-[#198760] bg-[#198760] text-white hover:bg-[#147554] hover:text-white dark:border-[#62d6a5] dark:bg-[#198760] dark:text-white dark:hover:bg-[#147554] dark:hover:text-white",
                  )}
                  aria-current={item === pagination.page ? "page" : undefined}
                >
                  {item}
                </Link>
              ),
            )
          ) : (
            <span
              className="inline-flex h-9 items-center rounded-lg border border-[#198760] bg-[#198760] px-3 text-xs font-semibold text-white dark:border-[#62d6a5] dark:bg-[#198760]"
              aria-current="page"
            >
              1
            </span>
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
        </div>
      </nav>
      <div className="grid gap-2 border-t border-[#e8efeb] px-4 py-3 text-xs text-[#627069] dark:border-[#303030] dark:text-[#a3a3a3] sm:grid-cols-2 sm:px-5 lg:grid-cols-4 xl:grid-cols-8">
        <span>Total lead: <strong>{summary.total}</strong></span>
        <span>Masuk hari ini: <strong>{summary.today}</strong></span>
        <span>Perlu follow-up: <strong>{summary.followUpDue}</strong></span>
        <span>Baru: <strong>{summary.new}</strong></span>
        <span>Tertarik: <strong>{summary.interested}</strong></span>
        <span>Tidak lanjut: <strong>{summary.notQualified}</strong></span>
        <span>Webhook terkirim: <strong>{summary.webhookDelivered}</strong></span>
        <span className="hidden text-[#82928a] dark:text-[#a3a3a3] xl:inline">{sortLabel}</span>
      </div>
    </section>
  );
}
