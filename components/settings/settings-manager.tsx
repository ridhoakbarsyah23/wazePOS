"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Loader2, ReceiptText } from "lucide-react";
import { businessTypes } from "@/lib/validation/onboarding";
import { DEFAULT_RECEIPT_SETTINGS, type ReceiptSettings } from "@/lib/validation/receipt-settings";

type Notice = { type: "success" | "error"; text: string } | null;

const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

export function SettingsManager({
  initialBusiness,
  allowReceiptSettings,
  initialReceiptSettings,
}: {
  initialBusiness: { name: string; type: string; timezone: string; currency: string };
  allowReceiptSettings: boolean;
  initialReceiptSettings: ReceiptSettings;
}) {
  const router = useRouter();
  const [businessForm, setBusinessForm] = useState({
    name: initialBusiness.name,
    type: initialBusiness.type,
  });
  const [receiptForm, setReceiptForm] = useState<ReceiptSettings>(initialReceiptSettings);
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  async function saveBusiness(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("business");
    setNotice(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(businessForm),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Profil usaha gagal disimpan.");

      setBusinessForm(payload.business);
      setNotice({ type: "success", text: payload.message });
      router.refresh();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Profil usaha gagal disimpan." });
    } finally {
      setSaving(null);
    }
  }

  async function saveReceiptSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("receipt");
    setNotice(null);

    try {
      const response = await fetch("/api/settings/receipt", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receiptForm),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Pengaturan struk gagal disimpan.");

      setNotice({ type: "success", text: payload.message });
      router.refresh();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Pengaturan struk gagal disimpan." });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="grid gap-5">
      <form onSubmit={saveBusiness} className="border border-[#d9e2dd] bg-white">
        <div className="flex items-center gap-3 border-b border-[#e5ebe8] px-5 py-4">
          <span className="grid size-9 place-items-center bg-[#edf7f2] text-[#187c59]">
            <Building2 className="size-4.5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#17211d]">Profil usaha</h2>
            <p className="mt-0.5 text-xs text-[#6c7a73]">Informasi yang tampil pada ruang kerja dan struk.</p>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold text-[#44534c] sm:col-span-2">
            Nama usaha
            <input
              required
              maxLength={100}
              value={businessForm.name}
              onChange={(event) => setBusinessForm((current) => ({ ...current, name: event.target.value }))}
              className="h-11 border border-[#cfd9d4] bg-white px-3 text-sm text-[#17211d] outline-none focus:border-[#187c59] focus:ring-2 focus:ring-[#187c59]/10"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#44534c]">
            Jenis usaha
            <select
              value={businessForm.type}
              onChange={(event) => setBusinessForm((current) => ({ ...current, type: event.target.value }))}
              className="h-11 border border-[#cfd9d4] bg-white px-3 text-sm text-[#17211d] outline-none focus:border-[#187c59] focus:ring-2 focus:ring-[#187c59]/10"
            >
              {businessTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#44534c]">
            Zona waktu
            <input
              value={initialBusiness.timezone}
              disabled
              className="h-11 border border-[#e1e7e4] bg-[#f6f8f7] px-3 text-sm text-[#6c7a73] disabled:opacity-100"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[#e5ebe8] bg-[#fafbfa] px-5 py-3">
          <p className="text-xs text-[#78857f]">Mata uang: {initialBusiness.currency}</p>
          <button
            type="submit"
            disabled={saving !== null || businessForm.name.trim().length < 2}
            className="inline-flex h-10 items-center gap-2 bg-[#187c59] px-4 text-sm font-bold text-white hover:bg-[#126a4b] disabled:cursor-not-allowed disabled:bg-[#c8d0cc]"
          >
            {saving === "business" && <Loader2 className="size-4 animate-spin" />}
            Simpan profil
          </button>
        </div>
      </form>

      {allowReceiptSettings && (
        <form onSubmit={saveReceiptSettings} className="border border-[#d9e2dd] bg-white">
        <div className="flex items-center gap-3 border-b border-[#e5ebe8] px-5 py-4">
          <span className="grid size-9 place-items-center bg-[#edf7f2] text-[#187c59]">
            <ReceiptText className="size-4.5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#17211d]">Pengaturan struk</h2>
            <p className="mt-0.5 text-xs text-[#6c7a73]">Kustomisasi isi struk yang dicetak dan dikirim via WhatsApp.</p>
          </div>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
          <div className="grid content-start gap-4">
            <label className="grid gap-1.5 text-xs font-semibold text-[#44534c]">
              Catatan kepala struk
              <input
                maxLength={120}
                value={receiptForm.headerNote}
                onChange={(event) => setReceiptForm((current) => ({ ...current, headerNote: event.target.value }))}
                placeholder="Mis. alamat, slogan, atau nomor telepon"
                className="h-10 border border-[#cfd9d4] px-3 text-sm outline-none focus:border-[#187c59] focus:ring-2 focus:ring-[#187c59]/10"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#44534c]">
              Catatan penutup struk
              <input
                maxLength={120}
                value={receiptForm.footerNote}
                onChange={(event) => setReceiptForm((current) => ({ ...current, footerNote: event.target.value }))}
                placeholder="Mis. info garansi atau promo"
                className="h-10 border border-[#cfd9d4] px-3 text-sm outline-none focus:border-[#187c59] focus:ring-2 focus:ring-[#187c59]/10"
              />
            </label>

            <fieldset className="mt-1 grid gap-2.5">
              <legend className="mb-1 text-xs font-semibold text-[#44534c]">Bagian yang ditampilkan</legend>
              {([
                ["showLogo", "Logo wazePOS"],
                ["showCashier", "Nama kasir"],
                ["showDateTime", "Tanggal & jam"],
                ["showUnitPrice", "Harga satuan per item"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-3 border border-[#e1e7e4] bg-[#fafbfa] px-3 py-2">
                  <span className="text-xs font-semibold text-[#44534c]">{label}</span>
                  <input
                    type="checkbox"
                    checked={receiptForm[key]}
                    onChange={(event) => setReceiptForm((current) => ({ ...current, [key]: event.target.checked }))}
                    className="size-4 accent-[#187c59]"
                  />
                </label>
              ))}
              <label className="flex items-center justify-between gap-3 border border-[#e1e7e4] bg-[#fafbfa] px-3 py-2">
                <span className="text-xs font-semibold text-[#44534c]">Pesan penutup</span>
                <select
                  value={receiptForm.footerMessage}
                  onChange={(event) =>
                    setReceiptForm((current) => ({
                      ...current,
                      footerMessage: event.target.value as ReceiptSettings["footerMessage"],
                    }))
                  }
                  className="h-8 border border-[#cfd9d4] bg-white px-2 text-xs outline-none focus:border-[#187c59]"
                >
                  <option value="thankYou">Terima kasih + bukti pembayaran</option>
                  <option value="none">Tanpa pesan penutup</option>
                </select>
              </label>
            </fieldset>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving !== null}
                className="inline-flex h-10 items-center gap-2 bg-[#187c59] px-4 text-sm font-bold text-white hover:bg-[#126a4b] disabled:cursor-not-allowed disabled:bg-[#c8d0cc]"
              >
                {saving === "receipt" && <Loader2 className="size-4 animate-spin" />}
                Simpan pengaturan struk
              </button>
              <button
                type="button"
                onClick={() => setReceiptForm(DEFAULT_RECEIPT_SETTINGS)}
                className="inline-flex h-10 items-center border border-[#b8cbc1] px-3 text-xs font-bold text-[#126b4b] hover:bg-[#f2f8f5]"
              >
                Kembalikan ke bawaan
              </button>
            </div>
          </div>

          {/* Preview live mengikuti pengaturan saat ini */}
          <div className="grid content-start gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#78857f]">Pratinjau langsung</p>
            <div className="thermal-receipt-printable mx-auto w-full max-w-[300px] border border-dashed border-[#cddbd3] bg-[#fafcfb] p-4 font-mono text-[11px] leading-4 text-[#15211d]">
              <div className="text-center">
                {receiptForm.showLogo && (
                  <p className="m-0 text-sm font-black tracking-tight">
                    waze<span className="text-[#198760]">POS</span>
                  </p>
                )}
                <p className="m-0 font-bold">{initialBusiness.name}</p>
                {receiptForm.headerNote && <p className="m-0 mt-0.5 text-[10px] text-[#627069]">{receiptForm.headerNote}</p>}
              </div>
              {(receiptForm.showCashier || receiptForm.showDateTime) && (
                <div className="mt-2 flex justify-between border-b border-dashed border-[#cddbd3] pb-1.5 text-[10px] text-[#627069]">
                  {receiptForm.showDateTime && <span>22/09/2026 14:30</span>}
                  {receiptForm.showCashier && <span>Kasir: Andi</span>}
                </div>
              )}
              <div className="mt-2 space-y-1">
                {([
                  ["Kopi Susu Gula Aren", 2, 18000, 36000],
                  ["Roti Bakar Cokelat", 1, 15000, 15000],
                ] as const).map(([name, qty, unitPrice, subtotal]) => (
                  <div key={name} className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="m-0 truncate font-semibold">{name}</p>
                      {receiptForm.showUnitPrice && (
                        <p className="m-0 text-[10px] text-[#627069]">
                          {qty} × {money(unitPrice)}
                        </p>
                      )}
                    </div>
                    <strong>{money(subtotal)}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between border-t border-dashed border-[#cddbd3] pt-1.5 text-sm font-extrabold">
                <span>TOTAL</span>
                <span className="text-[#198760]">{money(51000)}</span>
              </div>
              <div className="mt-3 border-t border-dashed border-[#cddbd3] pt-1.5 text-center text-[10px] text-[#627069]">
                {receiptForm.footerMessage === "thankYou" && (
                  <>
                    <p className="m-0">Terima kasih atas kunjungan Anda!</p>
                    <p className="m-0 text-[9px] text-[#8b9991]">Simpan struk ini sebagai bukti pembayaran sah.</p>
                  </>
                )}
                {receiptForm.footerNote && <p className="m-0 mt-0.5">{receiptForm.footerNote}</p>}
              </div>
            </div>
          </div>
        </div>
      </form>
      )}

      {notice && (
        <div
          role="status"
          className={`flex items-start gap-2 border-l-2 px-4 py-3 text-sm ${notice.type === "success" ? "border-[#187c59] bg-[#edf7f2] text-[#126b4b]" : "border-rose-500 bg-rose-50 text-rose-700"}`}
        >
          {notice.type === "success" && <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}
    </div>
  );
}
