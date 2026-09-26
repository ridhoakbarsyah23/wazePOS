"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  AlertCircle,
  Building2,
  CalendarDays,
  ChevronRight,
  Clock3,
  CreditCard,
  Eye,
  History,
  LayoutDashboard,
  Mail,
  MapPin,
  Package,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Store,
  UserRound,
  UsersRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  PlatformAdminBusiness,
  PlatformAdminBusinessDetailData,
  PlatformAdminPaymentDetail,
} from "@/lib/admin/platform-admin-types";
import { formatBusinessReference, platformAdminStateMeta } from "@/lib/admin/platform-admin-ui";

type DetailTrigger = "icon" | "full";

type PlatformAdminBusinessDetailProps = {
  business: PlatformAdminBusiness;
  trigger?: DetailTrigger;
};

type DetailTab = "overview" | "subscription" | "payments" | "team" | "outlets" | "activity" | "audit";

const detailTabClass = "h-8 shrink-0 snap-start gap-1.5 whitespace-nowrap px-3 text-[11px] sm:h-9 sm:px-3.5 sm:text-xs";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function getBoundary(item: PlatformAdminBusiness) {
  return item.state.startsWith("trial") ? item.trialEndsAt : item.currentPeriodEnd;
}

function getBoundaryLabel(item: PlatformAdminBusiness) {
  if (item.state.startsWith("trial")) return "Akhir trial";
  if (item.state === "active") return "Akhir periode";
  return "Batas waktu";
}

function getPlanLabel(plan: PlatformAdminBusiness["plan"]) {
  return plan === "bisnis" ? "Bisnis" : plan === "tumbuh" ? "Tumbuh" : "Belum ada paket";
}

function getPaymentMeta(status: PlatformAdminPaymentDetail["status"]) {
  switch (status) {
    case "paid":
      return { label: "Berhasil", variant: "default" as const };
    case "pending":
      return { label: "Pending", variant: "warning" as const };
    case "failed":
      return { label: "Gagal", variant: "destructive" as const };
    case "refunded":
      return { label: "Dikembalikan", variant: "secondary" as const };
    default:
      return { label: "Kedaluwarsa", variant: "outline" as const };
  }
}

function DetailItem({
  icon: Icon,
  label,
  value,
  detail,
  mono = false,
  full = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={`flex min-h-[96px] min-w-0 flex-col justify-between gap-2 overflow-hidden rounded-2xl border border-[#e5eee9] bg-[#f9fcfa] p-3 sm:min-h-[108px] sm:p-4 ${full ? "col-span-1 sm:col-span-2 xl:col-span-3" : ""}`}>
      <dt className="flex min-w-0 items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#718078]">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white text-[#198760] shadow-sm">
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 break-words leading-4">{label}</span>
      </dt>
      <dd className={`min-w-0 text-sm font-extrabold leading-5 text-[#15211d] ${mono ? "break-all font-mono text-xs" : "break-words"}`}>
        {value}
        {detail && <span className="mt-1 block min-w-0 break-words text-xs font-medium leading-5 text-[#627069]">{detail}</span>}
      </dd>
    </div>
  );
}

function EmptyDetail({ children }: { children: string }) {
  return <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-[#dce8e1] bg-[#f9fcfa] px-5 py-10 text-center text-sm leading-6 text-[#627069]">{children}</div>;
}

function LoadingDetail() {
  return (
    <div className="min-w-0 space-y-3" aria-live="polite" aria-label="Memuat detail usaha">
      <div className="h-10 animate-pulse rounded-xl bg-[#edf3ef]" />
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-[#edf3ef] sm:h-28" />)}
      </div>
    </div>
  );
}

function PaymentList({ payments }: { payments: PlatformAdminBusinessDetailData["payments"] }) {
  if (payments.length === 0) return <EmptyDetail>Belum ada pembayaran untuk usaha ini.</EmptyDetail>;
  return (
    <ul className="min-w-0 space-y-2">
      {payments.map((payment) => {
        const meta = getPaymentMeta(payment.status);
        return (
          <li key={payment.id} className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border border-[#e5eee9] bg-[#f9fcfa] p-3 sm:flex-row sm:items-start sm:justify-between sm:p-4">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="break-words text-sm font-extrabold tabular-nums text-[#15211d]">{formatRupiah(payment.amount)}</span>
                <Badge className="shrink-0" variant={meta.variant}>{meta.label}</Badge>
              </div>
              <p className="mt-1 min-w-0 break-all text-xs leading-5 text-[#627069]">{payment.provider} · {payment.providerOrderId}</p>
              <p className="mt-1 break-words text-[11px] leading-4 text-[#82928a]">{formatDateTime(payment.paidAt ?? payment.createdAt)}</p>
            </div>
            <span className="w-fit shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-bold capitalize text-[#527066] shadow-sm">{payment.plan}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function PlatformAdminBusinessDetail({
  business,
  trigger = "full",
}: PlatformAdminBusinessDetailProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [detail, setDetail] = useState<PlatformAdminBusinessDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();

    void fetch(`/api/admin/businesses/${encodeURIComponent(business.id)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message ?? "Detail usaha belum dapat dimuat.");
        }
        return (await response.json()) as { detail: PlatformAdminBusinessDetailData };
      })
      .then((payload) => setDetail(payload.detail))
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "Detail usaha belum dapat dimuat.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [business.id, isOpen, reloadKey]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  const currentBusiness = detail?.business ?? business;
  const currentMeta = platformAdminStateMeta[currentBusiness.state];
  const businessReference = formatBusinessReference(currentBusiness.id, currentBusiness.createdAt);

  function openDetail() {
    setError("");
    setDetail(null);
    setIsLoading(true);
    setActiveTab("overview");
    setIsOpen(true);
  }

  function retryDetail() {
    setError("");
    setDetail(null);
    setIsLoading(true);
    setReloadKey((value) => value + 1);
  }

  return (
    <>
      <Button
        type="button"
        variant={trigger === "icon" ? "ghost" : "outline"}
        size="sm"
        onClick={openDetail}
        aria-label={`Lihat detail ${business.name}`}
        className={trigger === "icon" ? "size-9 p-0 text-[#527066] hover:bg-[#eaf7f0] hover:text-[#106348] [&_svg]:size-3.5" : "h-10 w-full gap-2 px-3 text-xs sm:w-auto [&_svg]:size-3.5"}
      >
        <Eye className="size-3.5" aria-hidden="true" />
        {trigger === "full" && <span>Lihat detail</span>}
        {trigger === "full" && <ChevronRight className="ml-auto size-3.5" aria-hidden="true" />}
      </Button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          data-admin-portal
          className="fixed inset-0 z-[250] flex items-end justify-center bg-[#09271d]/60 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-[3px] sm:items-center sm:p-6"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          <div className="absolute inset-0" aria-hidden="true" onClick={() => setIsOpen(false)} />
          <section ref={dialogRef} className="relative flex h-[calc(100dvh-1rem-env(safe-area-inset-bottom))] max-h-[calc(100dvh-1rem-env(safe-area-inset-bottom))] w-full flex-col overflow-hidden rounded-t-3xl border border-[#dfe8e3] bg-white shadow-[0_30px_90px_rgba(4,42,29,.32)] sm:h-[min(92dvh,900px)] sm:max-h-[92dvh] sm:max-w-5xl sm:rounded-3xl">
            <div className="flex shrink-0 items-start gap-3 border-b border-[#e8efeb] bg-white p-4 sm:p-5 lg:p-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eaf7f0] text-[#198760] sm:size-12">
                <Building2 className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#718078]">Detail usaha</p>
                <h2 id={titleId} className="m-0 mt-1 line-clamp-2 break-words text-lg font-black leading-6 text-[#15211d] sm:text-xl">{currentBusiness.name}</h2>
                <p id={descriptionId} className="m-0 mt-1 break-words text-xs leading-5 text-[#627069]">
                  {currentBusiness.type} · {currentBusiness.onboardingCompleted ? "Onboarding selesai" : "Onboarding belum selesai"}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-xl text-[#718078] transition hover:bg-[#eef6f2] hover:text-[#15211d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/15 sm:size-9"
                aria-label="Tutup detail usaha"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5 lg:p-6">
              <div className="mb-4 flex min-w-0 flex-col gap-2 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
                <Badge className="w-fit shrink-0" variant={currentMeta.variant}>{currentMeta.label}</Badge>
                <span className="min-w-0 break-all text-left text-[11px] font-semibold leading-5 text-[#718078] sm:max-w-[58%] sm:text-right">Kode: {businessReference}</span>
              </div>

              {isLoading && !detail ? <LoadingDetail /> : error && !detail ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="m-0 font-extrabold">Detail belum dapat dimuat</p>
                      <p className="m-0 mt-1 text-xs leading-5">{error}</p>
                      <Button type="button" variant="outline" size="sm" className="mt-3 h-9 gap-2 px-3 text-xs [&_svg]:size-3.5" onClick={retryDetail}>
                        <RotateCcw className="size-3.5" aria-hidden="true" />
                        Coba lagi
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DetailTab)} className="w-full min-w-0 max-w-full">
                  <p className="mb-2 text-[11px] font-semibold text-[#82928a] sm:hidden">Geser tab di bawah ini untuk melihat menu lainnya</p>
                  <TabsList
                    className="platform-admin-tabs-scroll sticky top-0 z-10 !flex w-full min-w-0 max-w-full flex-nowrap snap-x gap-1 overflow-x-auto overscroll-x-contain rounded-xl p-1 sm:flex-wrap sm:justify-start sm:overflow-visible sm:snap-none"
                    aria-label="Tab detail usaha"
                  >
                    <TabsTrigger className={detailTabClass} value="overview"><span className="inline-flex items-center gap-1.5"><LayoutDashboard className="size-3.5" />Ringkasan</span></TabsTrigger>
                    <TabsTrigger className={detailTabClass} value="subscription"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5" />Subscription</span></TabsTrigger>
                    <TabsTrigger className={detailTabClass} value="payments"><span className="inline-flex items-center gap-1.5"><CreditCard className="size-3.5" />Pembayaran</span></TabsTrigger>
                    <TabsTrigger className={detailTabClass} value="team"><span className="inline-flex items-center gap-1.5"><UsersRound className="size-3.5" />Tim</span></TabsTrigger>
                    <TabsTrigger className={detailTabClass} value="outlets"><span className="inline-flex items-center gap-1.5"><Store className="size-3.5" />Outlet</span></TabsTrigger>
                    <TabsTrigger className={detailTabClass} value="activity"><span className="inline-flex items-center gap-1.5"><Activity className="size-3.5" />Aktivitas</span></TabsTrigger>
                    <TabsTrigger className={detailTabClass} value="audit"><span className="inline-flex items-center gap-1.5"><History className="size-3.5" />Audit</span></TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview">
                    <dl className="grid min-w-0 grid-cols-1 gap-2 sm:gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3">
                      <DetailItem icon={UserRound} label="Owner" value={currentBusiness.ownerName ?? "Belum tersedia"} detail={currentBusiness.ownerEmail ?? undefined} />
                      <DetailItem icon={Mail} label="Email owner" value={currentBusiness.ownerEmail ?? "Belum tersedia"} />
                      <DetailItem icon={Package} label="Paket" value={getPlanLabel(currentBusiness.plan)} />
                      <DetailItem icon={ShieldCheck} label="Status subscription" value={currentMeta.label} detail={currentBusiness.subscriptionStatus ?? "Tidak ada subscription"} />
                      <DetailItem icon={Clock3} label={getBoundaryLabel(currentBusiness)} value={formatDate(getBoundary(currentBusiness))} />
                      <DetailItem icon={CalendarDays} label="Terdaftar" value={formatDate(currentBusiness.createdAt)} />
                      <DetailItem icon={MapPin} label="Outlet" value={`${currentBusiness.outletCount} lokasi`} />
                      <DetailItem icon={UsersRound} label="Anggota" value={`${currentBusiness.memberCount} anggota`} />
                      <DetailItem icon={Building2} label="Kode usaha" value={businessReference} mono full />
                    </dl>
                  </TabsContent>

                  <TabsContent value="subscription">
                    {currentBusiness.subscriptionStatus ? (
                      <div className="min-w-0 space-y-3">
                        <div className="rounded-2xl border border-[#e5eee9] bg-[#f9fcfa] p-3 sm:p-4">
                          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-[#198760]"><WalletCards className="size-4" /></span>
                              <div className="min-w-0"><p className="m-0 break-words text-sm font-extrabold text-[#15211d]">Paket {getPlanLabel(currentBusiness.plan)}</p><p className="m-0 mt-0.5 break-all text-xs leading-5 text-[#627069]">{currentBusiness.subscriptionStatus}</p></div>
                            </div>
                            <Badge className="w-fit shrink-0" variant={currentMeta.variant}>{currentMeta.label}</Badge>
                          </div>
                        </div>
                        <dl className="grid min-w-0 grid-cols-1 gap-2 sm:gap-3 min-[420px]:grid-cols-2">
                          <DetailItem icon={Clock3} label="Akhir trial" value={formatDate(currentBusiness.trialEndsAt)} />
                          <DetailItem icon={CalendarDays} label="Akhir periode" value={formatDate(currentBusiness.currentPeriodEnd)} />
                        </dl>
                        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                          Status ini bersifat read-only. Perubahan subscription dilakukan melalui alur pelanggan, bukan dari halaman Platform Admin.
                        </p>
                      </div>
                    ) : <EmptyDetail>Belum ada subscription untuk usaha ini.</EmptyDetail>}
                  </TabsContent>

                  <TabsContent value="payments">
                    <div className="mb-3 flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h3 className="m-0 text-sm font-black text-[#15211d]">Riwayat pembayaran</h3><p className="m-0 mt-1 text-xs text-[#627069]">10 transaksi terakhir</p></div><ReceiptText className="size-4 shrink-0 text-[#82928a]" /></div>
                    <PaymentList payments={detail?.payments ?? []} />
                  </TabsContent>

                  <TabsContent value="team">
                    {detail?.members?.length ? (
                      <ul className="min-w-0 space-y-2">
                        {detail.members.map((member) => (
                          <li key={member.id} className="flex min-w-0 flex-col gap-2 overflow-hidden rounded-2xl border border-[#e5eee9] bg-[#f9fcfa] p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-4">
                            <div className="min-w-0 flex-1">
                              <p className="m-0 break-words text-sm font-extrabold text-[#15211d]">{member.name}</p>
                              <p className="m-0 mt-1 min-w-0 break-all text-xs leading-5 text-[#627069]">{member.email}</p>
                            </div>
                            <Badge className="w-fit shrink-0 capitalize" variant="outline">{member.role}</Badge>
                          </li>
                        ))}
                      </ul>
                    ) : <EmptyDetail>Data anggota belum tersedia.</EmptyDetail>}
                  </TabsContent>

                  <TabsContent value="outlets">
                    {detail?.outlets?.length ? (
                      <ul className="grid min-w-0 grid-cols-1 gap-2 sm:gap-3 min-[560px]:grid-cols-2">
                        {detail.outlets.map((item) => (
                          <li key={item.id} className="min-w-0 overflow-hidden rounded-2xl border border-[#e5eee9] bg-[#f9fcfa] p-3 sm:p-4">
                            <div className="flex min-w-0 items-start gap-2">
                              <MapPin className="mt-0.5 size-4 shrink-0 text-[#198760]" aria-hidden="true" />
                              <p className="m-0 min-w-0 flex-1 break-words text-sm font-extrabold text-[#15211d]">{item.name}</p>
                            </div>
                            <p className="m-0 mt-1 min-w-0 break-words pl-6 text-xs leading-5 text-[#627069]">{item.address ?? "Alamat belum diisi"}</p>
                          </li>
                        ))}
                      </ul>
                    ) : <EmptyDetail>Belum ada outlet terdaftar.</EmptyDetail>}
                  </TabsContent>

                  <TabsContent value="activity">
                    <div className="grid min-w-0 grid-cols-1 gap-2 sm:gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
                      <DetailItem icon={ReceiptText} label="Transaksi selesai" value={String(detail?.activity.saleCount ?? 0)} />
                      <DetailItem icon={WalletCards} label="Pendapatan transaksi" value={formatRupiah(detail?.activity.grossRevenue ?? 0)} />
                      <DetailItem icon={Clock3} label="Aktivitas terakhir" value={formatDate(detail?.activity.lastSaleAt)} />
                    </div>
                    {detail?.activity.latestSales.length ? (
                      <ul className="mt-3 min-w-0 space-y-2">
                        {detail.activity.latestSales.map((item) => (
                          <li key={item.id} className="flex min-w-0 flex-col gap-1.5 overflow-hidden rounded-xl border border-[#e5eee9] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="m-0 min-w-0 break-words text-xs font-extrabold text-[#15211d]">{item.invoiceNumber}</p>
                              <p className="m-0 mt-0.5 min-w-0 break-words text-[11px] leading-4 text-[#627069]">{item.outletName ?? "Tanpa outlet"} · {formatDateTime(item.createdAt)}</p>
                            </div>
                            <span className="w-fit shrink-0 rounded-lg bg-[#eef6f2] px-2 py-1 text-xs font-extrabold tabular-nums text-[#15211d] sm:text-right">{formatRupiah(item.total)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <div className="mt-3"><EmptyDetail>Belum ada aktivitas transaksi.</EmptyDetail></div>}
                  </TabsContent>

                  <TabsContent value="audit">
                    {detail?.auditLog.length ? <ul className="min-w-0 space-y-2">{detail.auditLog.map((item) => <li key={item.id} className="min-w-0 overflow-hidden rounded-2xl border border-[#e5eee9] bg-[#f9fcfa] p-3 sm:p-3.5"><div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2"><p className="m-0 min-w-0 flex-1 break-words text-xs font-extrabold text-[#15211d]">{item.action === "business_detail_view" ? "Detail usaha dibuka" : item.action === "business_export" ? "Daftar usaha diekspor" : item.action}</p><time className="shrink-0 text-[11px] tabular-nums text-[#82928a]">{formatDateTime(item.createdAt)}</time></div><p className="m-0 mt-1 min-w-0 break-all text-xs leading-5 text-[#627069]">{item.adminName ?? item.adminEmail ?? "Admin"}</p></li>)}</ul> : <EmptyDetail>Belum ada aktivitas admin terekam.</EmptyDetail>}
                  </TabsContent>
                </Tabs>
              )}
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#e8efeb] bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:p-5 sm:pb-5">
              <Button type="button" variant="outline" size="sm" className="h-9 w-full gap-2 px-3 text-xs sm:w-auto [&_svg]:size-3.5" onClick={() => setIsOpen(false)}>
                <X className="size-3.5" aria-hidden="true" />
                Tutup
              </Button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
