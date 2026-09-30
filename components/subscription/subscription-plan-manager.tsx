"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Copy, CreditCard, Crown, LoaderCircle, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BankTransferDestination } from "@/shared/billing/bank-transfer";
import { planIds, plans, type PlanId } from "@/shared/billing/plans";

const includedFeatures: Record<PlanId, string[]> = {
  tumbuh: [
    "Maksimal 1 Gerai Toko",
    "Maksimal 2 Akun Staf (termasuk Owner)",
    "Hingga 100 Produk Aktif",
    "Pembayaran Kasir Tunai",
    "Cetak struk kasir standar 58 mm / 80 mm",
    "Kelola hingga 200 pelanggan + member di kasir",
  ],
  bisnis: [
    "Pembayaran Tunai, Kartu Debit & Kredit EDC",
    "Arus Kas uang masuk & keluar (realtime)",
    "Manajemen stok & peringatan stok menipis",
    "Catatan per item di struk",
    "Hingga 5 Gerai / Multi-Cabang",
    "Akun Staf Kasir & Admin Tanpa Batas",
    "Katalog Produk Tanpa Batas",
    "Ekspor Laporan Penjualan (Excel / CSV)",
    "Kustomisasi pengaturan struk",
    "Mode Gelap Dashboard",
    "Prioritas Dukungan Teknis",
  ],
};

type PendingOrder = {
  paymentId: string;
  orderId: string;
  plan: PlanId;
  amount: number;
  proofUploaded: boolean;
  senderBank: string | null;
  senderAccountName: string | null;
};

type CheckoutResponse = {
  message?: string;
  paymentId?: string;
  orderId?: string;
  amount?: number;
  destination?: BankTransferDestination;
  proofUploaded?: boolean;
  reused?: boolean;
};

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export function SubscriptionPlanManager({
  initialPlan,
  canChangePlan,
  subscriptionStatus,
  paymentConfigured,
  destination,
  initialPending,
}: {
  initialPlan: PlanId;
  canChangePlan: boolean;
  subscriptionStatus: "trialing" | "active" | "past_due" | "cancelled" | "missing";
  paymentConfigured: boolean;
  destination: BankTransferDestination;
  initialPending: PendingOrder | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePlan, setActivePlan] = useState(initialPlan);
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(initialPending);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [senderBank, setSenderBank] = useState(initialPending?.senderBank ?? "");
  const [senderAccountName, setSenderAccountName] = useState(initialPending?.senderAccountName ?? "");
  const [uploadPending, setUploadPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function changePlan(plan: PlanId) {
    if (subscriptionStatus === "active" || plan === activePlan) return;
    setActivePlan(plan);

    if (canChangePlan) {
      setPendingPlan(plan);
      setMessage(null);

      try {
        const response = await fetch("/api/subscription", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const payload = (await response.json()) as { message?: string; plan?: PlanId };
        if (!response.ok) {
          setMessage({ type: "error", text: payload.message ?? "Paket belum berhasil diperbarui." });
          return;
        }

        setMessage({ type: "success", text: payload.message ?? "Paket berhasil diperbarui." });
        router.refresh();
      } catch {
        setMessage({ type: "error", text: "Tidak dapat terhubung ke server." });
      } finally {
        setPendingPlan(null);
      }
    }
  }

  async function startCheckout() {
    if (!paymentConfigured || subscriptionStatus === "active") return;
    setCheckoutPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: activePlan }),
      });
      const payload = (await response.json()) as CheckoutResponse;
      if (!response.ok || !payload.paymentId || !payload.orderId) {
        setMessage({ type: "error", text: payload.message ?? "Pesanan transfer belum berhasil dibuat." });
        return;
      }
      setPendingOrder({
        paymentId: payload.paymentId,
        orderId: payload.orderId,
        plan: activePlan,
        amount: payload.amount ?? plans[activePlan].annualPrice,
        proofUploaded: payload.proofUploaded ?? false,
        senderBank: null,
        senderAccountName: null,
      });
      setProofPreview(null);
      setMessage({
        type: "success",
        text: payload.reused
          ? "Pesanan transfer yang masih menunggu ditemukan dan ditampilkan kembali."
          : "Pesanan transfer dibuat. Silakan transfer lalu unggah bukti pembayaran.",
      });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server." });
    } finally {
      setCheckoutPending(false);
    }
  }

  function handleProofFile(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage({ type: "error", text: "Bukti transfer harus berupa gambar JPG, PNG, atau WebP." });
      return;
    }
    if (file.size > 4_000_000) {
      setMessage({ type: "error", text: "Ukuran bukti transfer maksimal 4 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProofPreview(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => setMessage({ type: "error", text: "Bukti transfer tidak dapat dibaca." });
    reader.readAsDataURL(file);
  }

  async function uploadProof() {
    if (!pendingOrder) return;
    if (senderBank.trim().length < 2 || senderAccountName.trim().length < 2) {
      setMessage({ type: "error", text: "Lengkapi bank pengirim dan nama pemilik rekening." });
      return;
    }
    if (!proofPreview) {
      setMessage({ type: "error", text: "Pilih file bukti transfer terlebih dahulu." });
      return;
    }
    setUploadPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/subscription/payments/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: pendingOrder.paymentId,
          senderBank: senderBank.trim(),
          senderAccountName: senderAccountName.trim(),
          proofDataUrl: proofPreview,
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage({ type: "error", text: payload.message ?? "Bukti transfer belum berhasil diunggah." });
        return;
      }
      setPendingOrder({ ...pendingOrder, proofUploaded: true, senderBank: senderBank.trim(), senderAccountName: senderAccountName.trim() });
      setMessage({ type: "success", text: payload.message ?? "Bukti transfer diterima dan menunggu verifikasi admin." });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server." });
    } finally {
      setUploadPending(false);
    }
  }

  async function copyAccountNumber() {
    try {
      await navigator.clipboard.writeText(destination.accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage({ type: "error", text: "Nomor rekening tidak dapat disalin otomatis." });
    }
  }

  const isPaidActive = subscriptionStatus === "active";
  const showProofPanel = pendingOrder && pendingOrder.plan === activePlan;

  return (
    <div>
      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={`mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold ${
            message.type === "success"
              ? "border-[#cae8d9] bg-[#eaf7f0] text-[#106348]"
              : "border-[#f3c8c4] bg-[#fff2f1] text-[#a4382f]"
          }`}
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {message.text}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {planIds.map((planId) => {
          const plan = plans[planId];
          const active = activePlan === planId;
          const pending = pendingPlan === planId;
          return (
            <Card key={planId} className={active ? "border-[#63b792] ring-4 ring-[#198760]/8" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`grid size-11 place-items-center rounded-xl ${
                      active ? "bg-[#198760] text-white" : "bg-[#eaf7f0] text-[#198760]"
                    }`}
                  >
                    <Crown className="size-5" />
                  </span>
                  {active && (
                    <Badge>
                      <Check className="size-3.5" />
                      {isPaidActive ? "Paket Aktif" : "Paket Dipilih"}
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-3">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <p className="mb-5">
                  <strong className="text-2xl tracking-[-0.8px]">
                    {formatRupiah(plan.annualPrice)}
                  </strong>
                  <span className="text-xs text-[#627069]"> / tahun</span>
                </p>
                <ul className="mb-6 space-y-3">
                  {includedFeatures[planId].map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-[#42534c]">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#eaf7f0] text-[#198760]">
                        <Check className="size-3" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={active ? "secondary" : "default"}
                  disabled={active || isPaidActive || Boolean(pendingPlan)}
                  onClick={() => void changePlan(planId)}
                >
                  {pending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : active ? (
                    <Check />
                  ) : (
                    <Crown />
                  )}
                  {pending
                    ? "Mengganti paket..."
                    : active
                    ? "Paket ini dipilih"
                    : isPaidActive
                    ? "Paket aktif tidak dapat diubah"
                    : `Pilih ${plan.name}`}
                </Button>
                {active && !isPaidActive && (
                  <Button
                    className="mt-2 w-full"
                    disabled={!paymentConfigured || checkoutPending || Boolean(pendingPlan)}
                    onClick={() => void startCheckout()}
                  >
                    {checkoutPending ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <CreditCard />
                    )}
                    {checkoutPending
                      ? "Membuat pesanan transfer..."
                      : paymentConfigured
                      ? `Buat pesanan transfer ${plan.name}`
                      : "Rekening pembayaran belum dikonfigurasi"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showProofPanel && !isPaidActive && (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">Pembayaran via transfer bank</CardTitle>
            <CardDescription>
              Transfer tepat {formatRupiah(pendingOrder.amount)} ke rekening resmi, lalu unggah bukti agar admin dapat memverifikasi dan mengaktifkan paket.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-[#dfe8e3] bg-[#f9fcfa] p-4">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[#627069]">Rekening tujuan</p>
              <p className="mt-2 text-lg font-extrabold text-[#15211d]">
                {destination.bank} {destination.accountNumber}
              </p>
              <p className="m-0 mt-1 text-sm text-[#42534c]">a.n. {destination.accountName}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void copyAccountNumber()}>
                  <Copy /> {copied ? "Tersalin" : "Salin nomor rekening"}
                </Button>
                <Badge variant="secondary">Order {pendingOrder.orderId}</Badge>
                {pendingOrder.proofUploaded && <Badge>Bukti diterima</Badge>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sender-bank">Bank pengirim</Label>
                <Input
                  id="sender-bank"
                  value={senderBank}
                  maxLength={60}
                  placeholder="Contoh: BCA"
                  onChange={(event) => setSenderBank(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender-account-name">Nama pemilik rekening pengirim</Label>
                <Input
                  id="sender-account-name"
                  value={senderAccountName}
                  maxLength={120}
                  placeholder="Contoh: Nama Usaha Anda"
                  onChange={(event) => setSenderAccountName(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-proof">Bukti transfer (JPG/PNG/WebP, maks 4 MB)</Label>
              <input
                ref={fileInputRef}
                id="transfer-proof"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => handleProofFile(event.target.files?.[0])}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <UploadCloud /> Pilih gambar
                </Button>
                {proofPreview && <span className="text-xs font-semibold text-[#106348]">Gambar siap diunggah</span>}
              </div>
              {proofPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={proofPreview} alt="Pratinjau bukti transfer" className="mt-2 max-h-64 rounded-xl border border-[#dfe8e3] object-contain" />
              )}
            </div>

            <Button className="w-full sm:w-auto" disabled={uploadPending} onClick={() => void uploadProof()}>
              {uploadPending ? <LoaderCircle className="animate-spin" /> : <UploadCloud />}
              {uploadPending ? "Mengunggah bukti..." : pendingOrder.proofUploaded ? "Perbarui bukti transfer" : "Unggah bukti transfer"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
