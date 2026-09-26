import Link from "next/link";

export function AppFooter({ businessName }: { businessName?: string }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-[#dfe8e3] bg-white/60 text-[#15211d]">
      <div className="mx-auto flex w-[min(1240px,calc(100%-32px))] flex-col items-center justify-between gap-2 py-5 sm:flex-row">
        <p className="m-0 flex flex-wrap items-center justify-center gap-1.5 text-xs text-[#75857e]">
          <span className="font-black tracking-tight text-[#15211d]">
            waze<span className="text-[#198760]">POS</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>© {currentYear}</span>
          {businessName && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#556961]">{businessName}</span>
            </>
          )}
        </p>

        <nav
          aria-label="Navigasi footer"
          className="flex flex-wrap items-center justify-center gap-1 text-xs font-semibold text-[#556961]"
        >
          <Link
            href="/dashboard"
            className="rounded-lg px-2 py-1 transition-colors hover:bg-[#eaf7f0] hover:text-[#198760]"
          >
            Dashboard
          </Link>
          <Link
            href="/pos"
            className="rounded-lg px-2 py-1 transition-colors hover:bg-[#eaf7f0] hover:text-[#198760]"
          >
            Kasir
          </Link>
          <Link
            href="/privacy"
            className="rounded-lg px-2 py-1 transition-colors hover:bg-[#eaf7f0] hover:text-[#198760]"
          >
            Privasi
          </Link>
        </nav>
      </div>
    </footer>
  );
}
