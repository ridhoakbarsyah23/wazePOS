import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = {
  title: "Anda sedang offline — wazePOS",
};

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f4faf7] px-6 text-[#15211d]">
      <div className="w-full max-w-sm rounded-3xl border border-[#dfe8e3] bg-white p-8 text-center shadow-[0_10px_35px_rgba(16,65,48,.07)]">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff0e5] text-[#a35f12]">
          <WifiOff className="size-5" />
        </span>
        <h1 className="mt-4 text-lg font-extrabold tracking-tight">Koneksi internet terputus</h1>
        <p className="mt-2 text-sm leading-6 text-[#627069]">
          Halaman ini belum tersedia secara offline. Sambungkan kembali internet Anda, lalu coba muat ulang. Transaksi kasir tidak akan hilang — data tersimpan saat koneksi pulih.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#198760] px-5 text-sm font-bold text-white transition hover:bg-[#147554]"
        >
          Coba lagi
        </Link>
      </div>
    </main>
  );
}
