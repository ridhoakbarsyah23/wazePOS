import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { PlatformAdminAccountDetailDialog } from "@/components/admin/platform-admin-account-detail-dialog";
import { getPlatformAdminUsers } from "@/server/admin/platform-admin-users";
import { pageLinkClass } from "@/shared/pagination";

export const metadata: Metadata = {
  title: "Daftar Akun | Dashboard Admin wazePOS",
  robots: { index: false, follow: false },
};

const roleLabels = { owner: "Pemilik usaha", admin: "Admin usaha", cashier: "Kasir" };
function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export default async function PlatformAdminUsersPage({ searchParams }: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
  const { users, query, pagination } = await getPlatformAdminUsers(await searchParams);
  function pageHref(page: number) {
    const params = new URLSearchParams({ page: String(page) });
    if (query) params.set("q", query);
    return `/admin/users?${params}`;
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
          <Users aria-hidden="true" className="size-6 text-[#198760]" /> Daftar akun
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#627069]">
          Seluruh akun terdaftar, termasuk akun yang belum memverifikasi email atau membuat usaha. Buka detail akun untuk melihat informasi selengkapnya.
        </p>
      </header>

      <section aria-label="Direktori akun" className="min-w-0 rounded-2xl border border-[#dfe8e3] bg-white p-4 sm:p-5">
        <form key={query} action="/admin/users" method="get" role="search" aria-label="Pencarian akun" className="flex flex-wrap items-end gap-2">
          <label className="grid min-w-0 flex-[1_1_240px] gap-2 text-xs font-semibold text-[#627069]">
            Cari nama atau email
            <input name="q" defaultValue={query} maxLength={100} placeholder="Masukkan nama atau email" className="h-11 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 text-base text-[#15211d] outline-none focus:border-[#198760] focus:ring-4 focus:ring-[#198760]/10 sm:text-sm" />
          </label>
          <button type="submit" className="h-11 cursor-pointer rounded-xl bg-[#198760] px-5 text-sm font-bold text-white hover:bg-[#147554] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#198760]">Cari</button>
          {query && <Link href="/admin/users" className={`${pageLinkClass} h-11`}>Reset</Link>}
        </form>

        <p className="my-4 text-xs leading-5 text-[#627069]" role="status">
          Menampilkan {pagination.from.toLocaleString("id-ID")}–{pagination.to.toLocaleString("id-ID")} dari {pagination.total.toLocaleString("id-ID")} akun{query ? " sesuai pencarian" : ""}. Urutan terbaru, 10 akun per halaman.
        </p>

        {users.length === 0 ? (
          <p className="rounded-xl bg-[#f7faf8] p-6 text-center text-sm text-[#627069]">{query ? "Tidak ada akun yang sesuai dengan pencarian." : "Belum ada akun terdaftar."}</p>
        ) : (
          <ul className="grid list-none gap-3 p-0">
            {users.map((item) => (
              <li key={item.id} className="min-w-0 rounded-xl border border-[#dfe8e3] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 basis-48">
                    <h2 className="break-words text-sm font-bold">{item.name}</h2>
                    <p className="mt-1 break-all text-sm text-[#627069]">{item.email}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.emailVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {item.emailVerified ? "Email terverifikasi" : "Email belum terverifikasi"}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-[#627069]">Terdaftar {formatDate(item.createdAt)} WIB</p>
                <div className="mt-2">
                  <PlatformAdminAccountDetailDialog
                    name={item.name}
                    email={item.email}
                    accessLabel={item.isPlatformAdmin ? "Dashboard Admin" : "Pengguna"}
                    businessLabel={item.businessName ?? "Belum terhubung ke usaha"}
                    roleLabel={item.role ? roleLabels[item.role] : "Belum memiliki peran"}
                    privacyLabel={item.privacyAcceptedAt ? `${formatDate(item.privacyAcceptedAt)} WIB` : "Belum tercatat"}
                    updatedLabel={`${formatDate(item.updatedAt)} WIB`}
                    lastActiveLabel={item.lastActiveAt ? `${formatDate(item.lastActiveAt)} WIB` : "Belum pernah login"}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <nav aria-label="Halaman daftar akun" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#dfe8e3] pt-4">
          <span className="text-xs text-[#627069]">Halaman {pagination.page} dari {pagination.totalPages}</span>
          <div className="flex gap-2">
            {pagination.page > 1 && <Link href={pageHref(pagination.page - 1)} className={pageLinkClass}>Sebelumnya</Link>}
            {pagination.page < pagination.totalPages && <Link href={pageHref(pagination.page + 1)} className={pageLinkClass}>Berikutnya</Link>}
          </div>
        </nav>
      </section>
    </>
  );
}
