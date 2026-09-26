import type { Metadata } from "next";
import Link from "next/link";
import { getWhatsAppUrl } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — wazePOS",
  description:
    "Kebijakan privasi wazePOS: data yang dikumpulkan, cara penggunaan, penyimpanan, keamanan, dan hak pengguna.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const sections = [
  {
    title: "Data yang kami kumpulkan",
    body: "Data akun (nama, email), data usaha (nama usaha, gerai, produk, transaksi, stok), serta data teknis dasar (perangkat, log keamanan) yang diperlukan agar aplikasi berjalan.",
  },
  {
    title: "Cara data digunakan",
    body: "Data dipakai untuk menjalankan kasir, laporan, dan operasional usaha Anda, menjaga keamanan akun, serta meningkatkan layanan. Kami tidak menjual data pribadi Anda.",
  },
  {
    title: "Penyimpanan dan keamanan",
    body: "Data disimpan pada infrastruktur database terkelola dengan akses terbatas. Kami menerapkan kontrol akses berbasis peran dan pencatatan keamanan untuk area sensitif.",
  },
  {
    title: "Berbagi data",
    body: "Data hanya dibagikan ke penyedia layanan yang dibutuhkan untuk operasional (misalnya hosting, pembayaran) dan wajib tunduk pada ketentuan kerahasiaan. Tidak ada berbagi untuk iklan pihak ketiga.",
  },
  {
    title: "Hak Anda",
    body: "Anda dapat meminta akses, perbaikan, atau penghapusan data akun melalui pengaturan aplikasi atau menghubungi tim kami. Permintaan diverifikasi demi keamanan akun.",
  },
  {
    title: "Retensi",
    body: "Data operasional disimpan selama akun aktif. Data yang tidak lagi diperlukan dihapus atau dianonimkan sesuai kebutuhan operasional dan hukum yang berlaku.",
  },
];

export default function PrivacyPage() {
  const whatsappUrl = getWhatsAppUrl("general");

  return (
    <main className="min-h-dvh bg-[#f7fcf9] text-[#15211d]">
      <div className="mx-auto w-full max-w-[760px] px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dce7e1] bg-white px-3 text-xs font-extrabold text-[#147554] transition hover:border-[#9fcbb5] hover:bg-[#f1f8f4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/20"
        >
          <span aria-hidden="true">←</span> Kembali ke beranda
        </Link>

        <p className="mt-8 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#198760]">
          Kebijakan Privasi
        </p>
        <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
          Privasi data Anda, dijelaskan singkat.
        </h1>
        <p className="mt-3 max-w-[60ch] text-pretty text-sm leading-7 text-[#556961]">
          Halaman ini merangkum cara wazePOS mengumpulkan, memakai, dan melindungi
          data. Diperbarui September 2026. Untuk pertanyaan privasi, hubungi kami
          melalui{" "}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-[#147554] underline decoration-[#9bcab2] underline-offset-4 hover:text-[#0d5e42]"
          >
            WhatsApp tim wazePOS
          </a>
          .
        </p>

        <div className="mt-8 grid gap-3">
          {sections.map((section, index) => (
            <section
              key={section.title}
              aria-labelledby={`privacy-section-${index}`}
              className="rounded-2xl border border-[#dceae3] bg-white p-5 shadow-[0_10px_30px_rgba(18,77,56,0.06)]"
            >
              <h2
                id={`privacy-section-${index}`}
                className="m-0 text-base font-extrabold tracking-tight"
              >
                {section.title}
              </h2>
              <p className="m-0 mt-2 max-w-[62ch] text-sm leading-7 text-[#4f5e57]">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[#dceae3] pt-5 text-xs text-[#75857e]">
          <span>
            <span className="font-black tracking-tight text-[#15211d]">
              waze<span className="text-[#198760]">POS</span>
            </span>{" "}
            · © {new Date().getFullYear()}
          </span>
          <span className="flex flex-wrap items-center gap-3 font-semibold">
            <Link href="/" className="underline underline-offset-4 hover:text-[#147554]">
              Beranda
            </Link>
            <Link href="/login" className="underline underline-offset-4 hover:text-[#147554]">
              Masuk
            </Link>
          </span>
        </footer>
      </div>
    </main>
  );
}
