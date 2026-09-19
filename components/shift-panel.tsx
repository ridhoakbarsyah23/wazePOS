"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Outlet = { id: string; name: string };
type Shift = { id: string; outletId: string; openingCash: number; openedAt: string } | null;

export function ShiftPanel({ outlets, currentShift }: { outlets: Outlet[]; currentShift: Shift }) {
  const router = useRouter();
  const [outletId, setOutletId] = useState(currentShift?.outletId ?? outlets[0]?.id ?? "");
  const [amount, setAmount] = useState(currentShift ? "" : "0");
  const [shift, setShift] = useState(currentShift);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(action: "open" | "close") {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/shifts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, outletId, amount: Number(amount) }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.message ?? "Shift gagal diproses."); return; }
      setMessage(action === "open" ? "Shift berhasil dibuka." : `${result.message} Selisih kas: Rp ${Number(result.difference).toLocaleString("id-ID")}.`);
      if (action === "open") setShift({ id: result.id, outletId, openingCash: Number(amount), openedAt: new Date().toISOString() });
      else setShift(null);
      setAmount("");
      router.refresh();
    } catch { setMessage("Tidak dapat terhubung ke server."); } finally { setPending(false); }
  }

  return (
    <section className="rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-[0_8px_24px_rgba(16,65,48,.06)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-extrabold sm:text-lg">Shift kasir</h2><p className="mt-1 text-xs text-[#627069] sm:text-sm">{shift ? `Terbuka sejak ${new Date(shift.openedAt).toLocaleString("id-ID")}` : "Buka shift sebelum mulai operasional kasir."}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${shift ? "bg-[#eaf7f0] text-[#198760]" : "bg-[#fff0e5] text-[#a35f12]"}`}>{shift ? "Shift terbuka" : "Belum ada shift"}</span></div>
      {!shift && <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm font-bold text-[#34443d]">Gerai<select value={outletId} onChange={(event) => setOutletId(event.target.value)} className="h-11 rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3">{outlets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="grid gap-2 text-sm font-bold text-[#34443d]">Modal awal<input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0" max="2000000000" className="h-11 rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3" /></label></div>}
      {shift && <label className="mt-5 grid max-w-sm gap-2 text-sm font-bold text-[#34443d]">Kas fisik saat tutup<input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0" max="2000000000" placeholder="Masukkan hasil hitung kas" className="h-11 rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3" /></label>}
      <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" disabled={pending || !outletId || amount === ""} onClick={() => submit(shift ? "close" : "open")} className="rounded-xl bg-[#198760] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{pending ? "Memproses..." : shift ? "Tutup shift" : "Buka shift"}</button>{message && <span className="text-sm font-semibold text-[#198760]">{message}</span>}</div>
    </section>
  );
}
