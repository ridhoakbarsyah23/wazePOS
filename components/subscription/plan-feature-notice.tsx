import Link from "next/link";
import { ArrowRight, Crown, LockKeyhole } from "lucide-react";

type PlanFeatureNoticeProps = {
  businessName: string;
  role: "owner" | "admin" | "cashier";
  featureName: string;
  description: string;
};

export function PlanFeatureNotice({
  businessName,
  role,
  featureName,
  description,
}: PlanFeatureNoticeProps) {
  const isOwner = role === "owner";

  return (
    <div className="mx-auto flex min-h-[70dvh] w-[min(760px,calc(100%-32px))] items-center py-10">
      <section className="w-full rounded-3xl border border-[#eadfbf] bg-[#fffaf0] p-6 shadow-[0_12px_32px_rgba(154,106,18,.08)] sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[#f0d99a] bg-[#fff3cf] text-[#9a6a12]">
            <LockKeyhole className="size-6" />
          </span>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f0d99a] bg-white/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#8a6418]">
              <Crown className="size-3" /> Paket Bisnis
            </span>
            <h1 className="mt-3 text-xl font-extrabold tracking-tight text-[#533b12] sm:text-2xl">
              {featureName} tersedia di Paket Bisnis
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#80652a]">{description}</p>
            <p className="mt-2 text-xs leading-5 text-[#9a7a3a]">Bisnis: {businessName}</p>
          </div>
        </div>
        <div className="mt-6 border-t border-[#f0dfae] pt-5">
          {isOwner ? (
            <Link
              href="/subscription"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#9a6a12] px-4 text-xs font-extrabold text-white transition hover:bg-[#7d550d]"
            >
              Lihat Paket Bisnis
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <p className="text-xs leading-5 text-[#80652a]">
              Hubungi pemilik usaha untuk membuka fitur ini melalui Paket Bisnis.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
