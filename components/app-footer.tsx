import Link from "next/link";
import {
  ExternalLink,
  HelpCircle,
  LayoutDashboard,
  MessageCircle,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function AppFooter({ businessName }: { businessName?: string }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-[#dfe8e3] bg-gradient-to-b from-transparent via-[#f8fbf9] to-[#eef6f2]/80 text-[#15211d]">
      <div className="mx-auto w-[min(1240px,calc(100%-32px))] py-12">
        {/* Top Info Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 pb-10 border-b border-[#e2ece6]">
          {/* Col 1: Brand & Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-[#198760] text-white shadow-sm">
                <LayoutDashboard className="size-4" />
              </span>
              <span className="text-base font-black tracking-tight text-[#15211d]">
                waze<span className="text-[#198760]">POS</span>
              </span>
            </div>
            <p className="text-xs text-[#627069] leading-relaxed">
              Platform kasir pintar, manajemen inventaris, dan analitik bisnis terintegrasi untuk UMKM & ritel.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
              </span>
              <span>Sistem Cloud Aktif</span>
            </div>
          </div>

          {/* Col 2: Navigasi Cepat */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#15211d]">
              Navigasi Cepat
            </h4>
            <ul className="space-y-1.5 text-xs text-[#556961]">
              <li>
                <Link href="/pos" className="hover:text-[#198760] transition-colors flex items-center gap-1.5">
                  <span>Terminal Kasir POS</span>
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-[#198760] transition-colors flex items-center gap-1.5">
                  <span>Katalog Produk & Harga</span>
                </Link>
              </li>
              <li>
                <Link href="/inventory" className="hover:text-[#198760] transition-colors flex items-center gap-1.5">
                  <span>Manajemen Stok Opname</span>
                </Link>
              </li>
              <li>
                <Link href="/reports" className="hover:text-[#198760] transition-colors flex items-center gap-1.5">
                  <span>Laporan Omzet Harian</span>
                </Link>
              </li>
              <li>
                <Link href="/staff" className="hover:text-[#198760] transition-colors flex items-center gap-1.5">
                  <span>Manajemen Karyawan</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Keamanan & Data */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#15211d]">
              Keamanan Data
            </h4>
            <ul className="space-y-2 text-xs text-[#627069]">
              <li className="flex items-start gap-2">
                <ShieldCheck className="size-4 shrink-0 text-[#198760] mt-0.5" />
                <span>Enkripsi SSL 256-bit dan proteksi sesi aktif otomatis</span>
              </li>
              <li className="flex items-start gap-2">
                <Radio className="size-4 shrink-0 text-[#198760] mt-0.5" />
                <span>Pencadangan cloud realtime tanpa risiko data kasir hilang</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Bantuan & CS */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#15211d]">
              Pusat Bantuan
            </h4>
            <p className="text-xs text-[#627069] leading-relaxed">
              Butuh panduan operasional atau konsultasi fitur wazePOS? Tim kami siap membantu Anda.
            </p>
            <a
              href="https://wa.me/6281234567890?text=Halo%20wazePOS%2C%20saya%20butuh%20bantuan%20terkait%20dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#198760] to-[#126b4d] px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-[#198760]/20 hover:from-[#147554] hover:to-[#0c533b] transition-all duration-200 active:scale-95"
            >
              <MessageCircle className="size-3.5" />
              <span>Bantuan via WhatsApp</span>
              <ExternalLink className="size-3 opacity-70" />
            </a>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Tagline */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#75857e]">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span>© {currentYear} wazePOS. Hak cipta dilindungi.</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              Mendukung pertumbuhan bisnis dan UMKM Indonesia
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="size-3 text-[#198760]" />
              {businessName ? `Bisnis: ${businessName}` : "wazePOS Cloud"}
            </span>
            <span>·</span>
            <span className="rounded-md bg-[#e2ece6] px-2 py-0.5 text-[#34443d]">v1.0.4</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
