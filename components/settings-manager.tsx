"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Loader2, MapPin, Store } from "lucide-react";
import { businessTypes } from "@/lib/validation/onboarding";

type OutletSetting = {
  id: string;
  name: string;
  address: string | null;
};

type Notice = { type: "success" | "error"; text: string } | null;

export function SettingsManager({
  initialBusiness,
  initialOutlets,
}: {
  initialBusiness: { name: string; type: string; timezone: string; currency: string };
  initialOutlets: OutletSetting[];
}) {
  const router = useRouter();
  const [businessForm, setBusinessForm] = useState({
    name: initialBusiness.name,
    type: initialBusiness.type,
  });
  const [outlets, setOutlets] = useState(initialOutlets);
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

  function updateOutlet(id: string, field: "name" | "address", value: string) {
    setOutlets((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  async function saveOutlet(item: OutletSetting) {
    setSaving(item.id);
    setNotice(null);

    try {
      const response = await fetch(`/api/outlets/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: item.name, address: item.address ?? "" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Data gerai gagal disimpan.");

      setOutlets((current) =>
        current.map((outlet) => (outlet.id === item.id ? payload.outlet : outlet)),
      );
      setNotice({ type: "success", text: payload.message });
      router.refresh();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Data gerai gagal disimpan." });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] lg:items-start">
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

      <section className="border border-[#d9e2dd] bg-white">
        <div className="flex items-center gap-3 border-b border-[#e5ebe8] px-5 py-4">
          <span className="grid size-9 place-items-center bg-[#edf7f2] text-[#187c59]">
            <Store className="size-4.5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#17211d]">Gerai</h2>
            <p className="mt-0.5 text-xs text-[#6c7a73]">Perbarui nama dan alamat operasional.</p>
          </div>
        </div>

        <div className="divide-y divide-[#e5ebe8]">
          {outlets.map((item, index) => (
            <div key={item.id} className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-[#6c7a73]">Gerai {index + 1}</p>
                <MapPin className="size-4 text-[#91a099]" />
              </div>
              <div className="grid gap-3">
                <label className="grid gap-1.5 text-xs font-semibold text-[#44534c]">
                  Nama gerai
                  <input
                    required
                    maxLength={100}
                    value={item.name}
                    onChange={(event) => updateOutlet(item.id, "name", event.target.value)}
                    className="h-10 border border-[#cfd9d4] px-3 text-sm outline-none focus:border-[#187c59] focus:ring-2 focus:ring-[#187c59]/10"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-[#44534c]">
                  Alamat
                  <textarea
                    rows={2}
                    maxLength={300}
                    value={item.address ?? ""}
                    onChange={(event) => updateOutlet(item.id, "address", event.target.value)}
                    placeholder="Alamat gerai belum diisi"
                    className="resize-none border border-[#cfd9d4] px-3 py-2 text-sm leading-5 outline-none focus:border-[#187c59] focus:ring-2 focus:ring-[#187c59]/10"
                  />
                </label>
                <button
                  type="button"
                  disabled={saving !== null || item.name.trim().length < 1}
                  onClick={() => void saveOutlet(item)}
                  className="ml-auto inline-flex h-9 items-center gap-2 border border-[#b8cbc1] px-3 text-xs font-bold text-[#126b4b] hover:bg-[#f2f8f5] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving === item.id && <Loader2 className="size-3.5 animate-spin" />}
                  Simpan gerai
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {notice && (
        <div
          role="status"
          className={`flex items-start gap-2 border-l-2 px-4 py-3 text-sm lg:col-span-2 ${notice.type === "success" ? "border-[#187c59] bg-[#edf7f2] text-[#126b4b]" : "border-rose-500 bg-rose-50 text-rose-700"}`}
        >
          {notice.type === "success" && <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}
    </div>
  );
}
