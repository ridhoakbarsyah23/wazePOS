import {
  Activity,
  ArrowDownUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  ListFilter,
  MapPin,
  Package,
  Search,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { PlatformAdminBusinessDetail } from "@/components/admin/platform-admin-business-detail";
import { PlatformAdminFilterResetButton } from "@/components/admin/platform-admin-filter-reset-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPageNumbers, pageDisabledClass, pageLinkClass } from "@/lib/pagination";
import type { PlatformAdminBusiness } from "@/lib/platform-admin-types";
import { platformAdminStateMeta } from "@/lib/platform-admin-ui";
import { cn } from "@/lib/utils";

type PlatformAdminListFilters = {
  query: string;
  status: string;
  businessType?: string;
  plan?: string;
  onboarding?: string;
  registeredFrom?: string;
  registeredTo?: string;
  sort?: string;
};

type PlatformAdminBusinessListProps = {
  businesses: PlatformAdminBusiness[];
  filters: PlatformAdminListFilters;
  overview: {
    expiredSubscriptions: number;
    pastDue: number;
    cancelled: number;
  };
  directory: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    from: number;
    to: number;
  };
};

function getDate(value: Date | string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: Date | string | null) {
  return getDate(value)?.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) ?? "-";
}

function DateValue({ value }: { value: Date | string | null }) {
  const date = getDate(value);
  if (!date) return <>-</>;
  return <time dateTime={date.toISOString()}>{date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</time>;
}

function getBoundaryDate(item: PlatformAdminBusiness) {
  return item.state.startsWith("trial") ? item.trialEndsAt : item.currentPeriodEnd;
}

function getBoundaryLabel(item: PlatformAdminBusiness) {
  if (item.state.startsWith("trial")) return "Akhir trial";
  if (item.state === "active") return "Akhir periode";
  return "Batas waktu";
}

function addFilterParams(params: URLSearchParams, filters: PlatformAdminListFilters) {
  if (filters.query) params.set("q", filters.query);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.businessType) params.set("businessType", filters.businessType);
  if (filters.plan && filters.plan !== "all") params.set("plan", filters.plan);
  if (filters.onboarding && filters.onboarding !== "all") params.set("onboarding", filters.onboarding);
  if (filters.registeredFrom) params.set("registeredFrom", filters.registeredFrom);
  if (filters.registeredTo) params.set("registeredTo", filters.registeredTo);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
}

function buildDirectoryHref(page: number, filters: PlatformAdminListFilters) {
  const params = new URLSearchParams();
  addFilterParams(params, filters);
  params.set("page", String(page));
  return `/admin?${params.toString()}`;
}

function buildExportHref(filters: PlatformAdminListFilters) {
  const params = new URLSearchParams();
  addFilterParams(params, filters);
  const query = params.toString();
  return query ? `/api/admin/businesses/export?${query}` : "/api/admin/businesses/export";
}

function BusinessMeta({
  icon: Icon,
  label,
  value,
  title,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  title?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#edf2ef] bg-white p-2.5">
      <dt className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#82928a]">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="mt-1 truncate text-sm font-extrabold capitalize text-[#15211d]" title={title}>
        {value}
      </dd>
    </div>
  );
}

export function PlatformAdminBusinessList({
  businesses,
  filters,
  overview,
  directory,
}: PlatformAdminBusinessListProps) {
  const hasFilters = Boolean(
    filters.query ||
      (filters.status && filters.status !== "all") ||
      filters.businessType ||
      (filters.plan && filters.plan !== "all") ||
      (filters.onboarding && filters.onboarding !== "all") ||
      filters.registeredFrom ||
      filters.registeredTo ||
      (filters.sort && filters.sort !== "newest"),
  );

  return (
    <section aria-labelledby="business-list-title" className="mt-6 overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_24px_rgba(16,65,48,.05)] sm:mt-7">
      <div className="flex flex-col gap-4 border-b border-[#e8efeb] p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="business-list-title" className="m-0 flex items-center gap-2 text-lg font-black">
              <ListFilter className="size-4 text-[#198760]" aria-hidden="true" />
              Daftar usaha
            </h2>
            <span aria-live="polite" className="rounded-full bg-[#eef6f2] px-2.5 py-1 text-[11px] font-extrabold text-[#527066]">
              {directory.total} data
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#627069]">
            Menampilkan {directory.from}–{directory.to} dari {directory.total} usaha, maksimal {directory.pageSize} per halaman.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 lg:w-[820px] xl:w-[900px] lg:items-end">
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button asChild variant="outline" size="sm" className="h-9 gap-2 text-xs">
              <a href={buildExportHref(filters)} download>
                <Download className="size-3.5" aria-hidden="true" />
                Export CSV
              </a>
            </Button>
            <PlatformAdminFilterResetButton formId="platform-admin-business-filters" />
          </div>
          <form
            id="platform-admin-business-filters"
            key={JSON.stringify(filters)}
            className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 sm:items-center"
            action="/admin"
            method="get"
            role="search"
            aria-label="Filter daftar usaha"
          >
            <label className="relative col-span-2 min-w-0 sm:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#82928a]" aria-hidden="true" />
              <span className="sr-only">Cari usaha, owner, atau email</span>
              <input
                name="q"
                defaultValue={filters.query}
                maxLength={100}
                placeholder="Cari usaha, owner, atau email"
                className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 sm:h-10"
              />
            </label>
            <label>
              <span className="sr-only">Filter jenis usaha</span>
              <input
                name="businessType"
                list="platform-business-types"
                defaultValue={filters.businessType}
                maxLength={50}
                placeholder="Semua jenis"
                aria-label="Filter jenis usaha"
                className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 sm:h-10"
              />
            </label>
            <datalist id="platform-business-types">
              <option value="Toko" />
              <option value="Warung" />
              <option value="Kedai Kopi" />
              <option value="Restoran" />
              <option value="Laundry" />
              <option value="Ritel" />
              <option value="Lainnya" />
            </datalist>
            <select
              name="status"
              defaultValue={filters.status}
              aria-label="Filter status subscription"
              className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 sm:h-10"
            >
              <option value="all">Semua status</option>
              {Object.entries(platformAdminStateMeta).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
            <select
              name="plan"
              defaultValue={filters.plan ?? "all"}
              aria-label="Filter paket"
              className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 sm:h-10"
            >
              <option value="all">Semua paket</option>
              <option value="tumbuh">Tumbuh</option>
              <option value="bisnis">Bisnis</option>
              <option value="missing">Tanpa paket</option>
            </select>
            <select
              name="onboarding"
              defaultValue={filters.onboarding ?? "all"}
              aria-label="Filter status onboarding"
              className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 sm:h-10"
            >
              <option value="all">Semua onboarding</option>
              <option value="completed">Selesai</option>
              <option value="incomplete">Belum selesai</option>
            </select>
            <label className="min-w-0">
              <span className="sr-only">Tanggal terdaftar dari</span>
              <input
                type="date"
                name="registeredFrom"
                defaultValue={filters.registeredFrom}
                aria-label="Tanggal terdaftar dari"
                className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-xs font-semibold outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 sm:h-10"
              />
            </label>
            <label className="min-w-0">
              <span className="sr-only">Tanggal terdaftar sampai</span>
              <input
                type="date"
                name="registeredTo"
                defaultValue={filters.registeredTo}
                aria-label="Tanggal terdaftar sampai"
                className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-xs font-semibold outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 sm:h-10"
              />
            </label>
            <label className="relative min-w-0">
              <span className="sr-only">Urutkan data</span>
              <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#82928a]" aria-hidden="true" />
              <select
                name="sort"
                defaultValue={filters.sort ?? "newest"}
                aria-label="Urutkan data"
                className="h-11 w-full min-w-0 appearance-none rounded-xl border border-[#b8cbc1] bg-white pl-8 pr-3 text-xs font-semibold outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 sm:h-10"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="name_asc">Nama A–Z</option>
                <option value="name_desc">Nama Z–A</option>
                <option value="trial_ending">Akhir trial</option>
                <option value="activity">Aktivitas terakhir</option>
              </select>
            </label>
            <Button type="submit" size="sm" className="col-span-2 h-11 w-full sm:col-span-2 sm:h-10 lg:col-span-1">
              Terapkan
            </Button>
          </form>
        </div>
      </div>

      {businesses.length === 0 ? (
        <div className="px-5 py-14 text-center text-sm text-[#627069]" role="status">
          {hasFilters
            ? "Tidak ada usaha yang cocok dengan pencarian atau filter."
            : "Belum ada usaha yang terdaftar."}
        </div>
      ) : (
        <>
          <div
            className="hidden overflow-x-auto xl:block"
            role="region"
            aria-label="Tabel daftar usaha"
            tabIndex={0}
          >
            <table className="w-full min-w-[1160px] border-collapse text-left text-sm">
              <caption className="sr-only">Daftar usaha, owner, paket, dan status subscription</caption>
              <thead className="bg-[#f7faf8] text-[11px] uppercase tracking-[0.08em] text-[#627069]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-extrabold">Usaha</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Owner</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Paket</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Status</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Batas waktu</th>
                  <th scope="col" className="px-5 py-3 text-center font-extrabold">Outlet</th>
                  <th scope="col" className="px-5 py-3 text-center font-extrabold">Anggota</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Terdaftar</th>
                  <th scope="col" className="px-5 py-3 font-extrabold">Aktivitas</th>
                  <th scope="col" className="px-5 py-3 text-center font-extrabold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((item) => (
                  <tr key={item.id} className="border-t border-[#edf2ef] align-top transition hover:bg-[#fbfdfc]">
                    <th scope="row" className="max-w-[240px] px-5 py-4 text-left font-normal">
                      <p className="m-0 truncate font-extrabold" title={item.name}>{item.name}</p>
                      <p className="mt-1 truncate text-xs text-[#627069]">
                        {item.type} · {item.onboardingCompleted ? "Onboarding selesai" : "Belum selesai"}
                      </p>
                    </th>
                    <td className="max-w-[220px] px-5 py-4">
                      <p className="m-0 truncate font-semibold" title={item.ownerName ?? undefined}>{item.ownerName ?? "-"}</p>
                      <p className="mt-1 truncate text-xs text-[#627069]" title={item.ownerEmail ?? undefined}>
                        {item.ownerEmail ?? "Owner belum tersedia"}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-bold capitalize">{item.plan ?? "-"}</td>
                    <td className="px-5 py-4">
                      <Badge className="whitespace-nowrap" variant={platformAdminStateMeta[item.state].variant}>
                        {platformAdminStateMeta[item.state].label}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-[#4d5e57]"><DateValue value={getBoundaryDate(item)} /></td>
                    <td className="px-5 py-4 text-center font-bold tabular-nums">{item.outletCount}</td>
                    <td className="px-5 py-4 text-center font-bold tabular-nums">{item.memberCount}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-[#4d5e57]"><DateValue value={item.createdAt} /></td>
                    <td className="whitespace-nowrap px-5 py-4 text-[#4d5e57]"><DateValue value={item.lastActivityAt ?? null} /></td>
                    <td className="px-5 py-4 text-center">
                      <PlatformAdminBusinessDetail business={item} trigger="icon" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-[#edf2ef] xl:hidden">
            {businesses.map((item) => (
              <article key={item.id} className="p-4 sm:p-5">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="m-0 truncate text-sm font-extrabold" title={item.name}>{item.name}</h3>
                    <p className="mt-1 truncate text-xs text-[#627069]">
                      {item.type} · {item.onboardingCompleted ? "Onboarding selesai" : "Belum selesai"}
                    </p>
                  </div>
                  <Badge className="shrink-0" variant={platformAdminStateMeta[item.state].variant}>
                    {platformAdminStateMeta[item.state].label}
                  </Badge>
                </div>

                <div className="mt-4 rounded-2xl bg-[#f7faf8] p-3">
                  <div className="flex min-w-0 items-center gap-2 border-b border-[#e5eee9] pb-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-[#527066]">
                      <UserRound className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-bold" title={item.ownerName ?? undefined}>
                        {item.ownerName ?? "Owner belum tersedia"}
                      </p>
                      <p className="m-0 truncate text-xs text-[#627069]" title={item.ownerEmail ?? undefined}>
                        {item.ownerEmail ?? "Email owner belum tersedia"}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-2">
                    <BusinessMeta icon={Package} label="Paket" value={item.plan ?? "-"} />
                    <BusinessMeta icon={CalendarDays} label={getBoundaryLabel(item)} value={formatDate(getBoundaryDate(item))} />
                    <BusinessMeta icon={MapPin} label="Outlet" value={item.outletCount} />
                    <BusinessMeta icon={UsersRound} label="Anggota" value={item.memberCount} />
                    <div className="col-span-2 rounded-xl border border-[#edf2ef] bg-white p-2.5">
                      <dt className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#82928a]">
                        <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                        Terdaftar
                      </dt>
                      <dd className="mt-1 text-sm font-extrabold text-[#15211d]">{formatDate(item.createdAt)}</dd>
                    </div>
                  <div className="col-span-2 rounded-xl border border-[#edf2ef] bg-white p-2.5">
                    <dt className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#82928a]">
                      <Activity className="size-3.5 shrink-0" aria-hidden="true" />
                      Aktivitas terakhir
                    </dt>
                    <dd className="mt-1 text-sm font-extrabold text-[#15211d]">{formatDate(item.lastActivityAt ?? null)}</dd>
                  </div>
                  </dl>
                  <div className="mt-3 flex justify-end">
                    <PlatformAdminBusinessDetail business={item} trigger="full" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {directory.totalPages > 1 && (
        <nav className="flex flex-wrap items-center gap-1.5 border-t border-[#e8efeb] px-4 py-3 sm:px-5" aria-label="Navigasi halaman usaha">
          {directory.page > 1 ? (
            <Link href={buildDirectoryHref(directory.page - 1, filters)} className={cn(pageLinkClass, "gap-1.5")}>
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              Sebelumnya
            </Link>
          ) : (
            <span className={pageDisabledClass}>Sebelumnya</span>
          )}
          {getPageNumbers(directory.page, directory.totalPages).map((item, index) =>
            item === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="px-1 text-xs text-[#82928a]" aria-hidden="true">…</span>
            ) : (
              <Link
                key={item}
                href={buildDirectoryHref(item, filters)}
                className={cn(
                  pageLinkClass,
                  item === directory.page && "border-[#198760] bg-[#198760] text-white hover:bg-[#147554] hover:text-white",
                )}
                aria-current={item === directory.page ? "page" : undefined}
              >
                {item}
              </Link>
            ),
          )}
          {directory.page < directory.totalPages ? (
            <Link href={buildDirectoryHref(directory.page + 1, filters)} className={cn(pageLinkClass, "gap-1.5")}>
              Berikutnya
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <span className={pageDisabledClass}>Berikutnya</span>
          )}
        </nav>
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#e8efeb] px-4 py-3 text-xs text-[#627069] sm:px-5">
        <span>Langganan berakhir: <strong>{overview.expiredSubscriptions}</strong></span>
        <span>Past due: <strong>{overview.pastDue}</strong></span>
        <span>Dibatalkan: <strong>{overview.cancelled}</strong></span>
        <span className="ml-auto hidden text-[#82928a] sm:inline">Pembaruan otomatis dari database</span>
      </div>
    </section>
  );
}
