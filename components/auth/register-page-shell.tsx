import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Check } from "lucide-react";

export function RegisterPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f4f7f5] px-3 py-4 text-[#15211d] sm:p-6 lg:p-[clamp(16px,3vh,40px)]">
      <section className="grid w-full min-w-0 max-w-[1040px] overflow-hidden rounded-2xl border border-[#dce6df] bg-white shadow-[0_12px_48px_rgba(21,53,38,0.06)] lg:grid-cols-[0.7fr_1.3fr]">
        <aside className="hidden flex-col justify-between gap-8 bg-[#104c38] p-8 text-white lg:flex xl:p-10">
          <Link href="/" aria-label="wazePOS — Beranda" className="flex w-fit items-center gap-2.5 rounded-lg text-2xl font-extrabold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            <Image src="/logo.png" alt="" width={36} height={36} className="rounded-lg" priority />
            <span>waze<span className="text-[#a3e1be]">POS</span></span>
          </Link>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#a3e1be]">Kasir untuk usaha Anda</p>
            <h2 className="max-w-xs text-3xl font-semibold leading-tight tracking-tight">Mulai kelola usaha dengan lebih rapi.</h2>
            <p className="mt-4 text-sm leading-6 text-[#c7ded2]">Transaksi, stok, dan laporan dalam satu ruang kerja.</p>
            <ul className="mt-7 grid gap-3 text-sm text-[#e0eee6]">
              {["Catat penjualan", "Pantau persediaan", "Lihat laporan usaha"].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <Check aria-hidden="true" className="size-4 shrink-0 text-[#a3e1be]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-[#a8c9b8]">wazePOS · Jual. Pantau. Tumbuh.</p>
        </aside>

        <div className="min-w-0 px-5 py-6 sm:p-7 lg:p-[clamp(20px,3vh,36px)]">
          <nav aria-label="Navigasi pendaftaran" className="mb-3 flex items-center justify-between gap-3">
            <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-lg text-xs font-medium text-[#66756e] hover:text-[#147554] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#198760]">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Beranda
            </Link>
            <Link href="/" aria-label="wazePOS — Beranda" className="flex items-center gap-2 text-lg font-extrabold tracking-tight lg:hidden">
              <Image src="/logo.png" alt="" width={28} height={28} className="rounded-md" />
              <span>waze<span className="text-[#198760]">POS</span></span>
            </Link>
            <span className="hidden text-xs font-medium text-[#198760] lg:inline">Mulai uji coba gratis</span>
          </nav>
          <header>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Buat akun wazePOS</h1>
            <p className="mt-2 text-sm leading-6 text-[#66756e]">Pilih paket uji coba dan lengkapi data akun Anda.</p>
          </header>

          {children}

          <p className="mt-4 text-center text-sm leading-6 text-[#66756e]">
            Sudah punya akun?{" "}
            <Link href="/login" className="rounded-sm font-semibold text-[#147554] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#198760]">Masuk</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
