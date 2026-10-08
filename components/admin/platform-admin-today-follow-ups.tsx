import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { followUpStatusLabels } from "@/shared/admin/platform-admin-follow-up";
import type { PlatformAdminTodayFollowUps } from "@/shared/admin/platform-admin-types";

function displayDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function displayDateTime(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function isOverdue(followUpDate: string, today: string) {
  return today ? followUpDate < today : false;
}

export function PlatformAdminTodayFollowUps({ followUps }: { followUps: PlatformAdminTodayFollowUps }) {
  return (
    <section aria-labelledby="today-follow-ups-title" className="mt-6 rounded-2xl border border-[#dfe8e3] bg-white p-4 dark:border-[#303030] dark:bg-[#0d0d0d] sm:mt-7 sm:p-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h2 id="today-follow-ups-title" className="admin-display m-0 flex min-w-0 items-center gap-2 text-lg dark:text-white">
          <CalendarDays className="size-5 shrink-0 text-[#198760] dark:text-[#62d6a5]" aria-hidden="true" />
          <span className="min-w-0 break-words">Tindak lanjut hari ini</span>
        </h2>
        <span className={`admin-mono shrink-0 rounded-lg px-3 py-1 text-sm font-bold ${followUps.total > 0 ? "bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200" : "bg-[#edf3ef] text-[#627069] dark:bg-[#151515] dark:text-[#a3a3a3]"}`}>
          {followUps.total} perlu dihubungi
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-[#627069] dark:text-[#a3a3a3]">
        {followUps.today
          ? `Jadwal per ${displayDate(followUps.today)}, termasuk yang terlewat. Diambil dari catatan terbaru setiap usaha.`
          : "Diambil dari catatan terbaru setiap usaha, termasuk jadwal yang terlewat."}
      </p>

      {followUps.items.length === 0 ? (
        <p role="status" className="mt-4 rounded-xl border border-dashed border-[#dce8e1] bg-[#f9fcfa] p-5 text-center text-sm leading-6 text-[#627069] dark:border-[#303030] dark:bg-[#151515] dark:text-[#a3a3a3]">
          Tidak ada tindak lanjut untuk hari ini. Semua jadwal sudah selesai atau belum ada yang jatuh tempo.
        </p>
      ) : (
        <>
          <ul className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2">
            {followUps.items.map((item) => {
              const overdue = isOverdue(item.followUpDate, followUps.today);
              return (
                <li key={`${item.businessId}-${item.followUpDate}-${item.createdAt}`} className="min-w-0 rounded-xl border border-[#e5eee9] p-4 dark:border-[#303030] dark:bg-[#151515]">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <p className="m-0 min-w-0 flex-1 break-words text-sm font-extrabold text-[#15211d] dark:text-white">{item.businessName}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${item.status === "in_progress" ? "bg-sky-50 text-sky-800 dark:bg-sky-400/10 dark:text-sky-200" : "bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200"}`}>
                      {followUpStatusLabels[item.status]}
                    </span>
                  </div>
                  <p className="m-0 mt-1 min-w-0 break-words text-xs leading-5 text-[#627069] dark:text-[#a3a3a3]">
                    {item.ownerName ?? item.ownerEmail ?? "Owner belum tersedia"}
                  </p>
                  <p className="m-0 mt-2 min-w-0 break-words text-sm leading-6 text-[#15211d] line-clamp-3 dark:text-[#f5f5f5]">{item.note}</p>
                  <p className="m-0 mt-2 text-xs leading-5 text-[#627069] dark:text-[#a3a3a3]">
                    {overdue ? (
                      <span className="font-bold text-amber-800 dark:text-amber-200">Terlewat sejak {displayDate(item.followUpDate)}</span>
                    ) : (
                      <span>Jatuh tempo hari ini · {displayDate(item.followUpDate)}</span>
                    )}
                    <span className="block">Dicatat oleh {item.authorName} · {displayDateTime(item.createdAt)}</span>
                  </p>
                  <Link
                    href={`/admin/businesses?q=${encodeURIComponent(item.businessName)}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#106348] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/20 dark:text-[#62d6a5] dark:focus-visible:ring-[#62d6a5]/25"
                  >
                    Buka tindak lanjut <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
          {followUps.total > followUps.items.length && (
            <p className="m-0 mt-3 text-xs leading-5 text-[#627069] dark:text-[#a3a3a3]">
              Menampilkan {followUps.items.length} dari {followUps.total} usaha. Cari usaha di direktori untuk melihat sisanya.
            </p>
          )}
        </>
      )}
    </section>
  );
}
