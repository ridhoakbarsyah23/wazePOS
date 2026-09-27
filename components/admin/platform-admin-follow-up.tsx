"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { followUpStatusLabels, type FollowUpData, type FollowUpEntry } from "@/shared/admin/platform-admin-follow-up";

const fieldClass = "mt-1 w-full min-w-0 rounded-xl border border-[#b8cbc1] bg-white px-3 py-2 text-sm outline-none focus:border-[#198760] focus:ring-2 focus:ring-[#198760]/20 disabled:opacity-60";
function displayDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function PlatformAdminFollowUp({ businessId, onPendingChange }: { businessId: string; onPendingChange: (pending: boolean) => void }) {
  const [data, setData] = useState<FollowUpData | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<FollowUpEntry["status"]>("open");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [needsReload, setNeedsReload] = useState(false);
  const [expectedLatestId, setExpectedLatestId] = useState<string | null>(null);
  const requestId = useRef(0);
  const saveLock = useRef(false);
  const id = useId();
  const endpoint = `/api/admin/businesses/${encodeURIComponent(businessId)}/follow-ups`;
  const dirty = note.length > 0 || status !== (data?.latest?.status ?? "open") || date !== (data?.latest?.followUpDate ?? "");

  useEffect(() => { onPendingChange(dirty || saving); }, [dirty, saving, onPendingChange]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || saving) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  const load = useCallback(async (page: number, syncForm: boolean) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${endpoint}?page=${page}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Riwayat belum dapat dimuat.");
      if (currentRequest !== requestId.current) return;
      setData(payload as FollowUpData);
      if (syncForm) {
        setExpectedLatestId(payload.latest?.id ?? null);
        setStatus(payload.latest?.status ?? "open");
        setDate(payload.latest?.followUpDate ?? "");
      }
      setNeedsReload(false);
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setError(cause instanceof Error ? cause.message : "Riwayat belum dapat dimuat.");
        setNeedsReload(true);
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(1, true);
    }, 0);
    return () => {
      requestId.current += 1;
      window.clearTimeout(timer);
    };
  }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveLock.current || !data || needsReload || loading) return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, status, followUpDate: status === "completed" ? null : date || null, expectedLatestId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 409 || response.status >= 500) setNeedsReload(true);
        throw new Error(payload.message ?? "Catatan belum dapat disimpan.");
      }
      setNote("");
      setData((previous) => previous ? { ...previous, latest: payload.entry } : previous);
      setMessage("Catatan tindak lanjut tersimpan.");
      await load(1, true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Catatan belum dapat disimpan.");
      setNeedsReload(true);
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <h3 className="m-0 text-base font-extrabold">Tindak lanjut pelanggan</h3>
        <p className="mt-1 text-xs leading-5 text-[#627069]">Catatan internal untuk Platform Admin. Setiap penyimpanan menambah riwayat baru.</p>
      </div>
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><p>{error}</p><Button type="button" variant="outline" className="mt-2" disabled={loading || saving} onClick={() => void load(1, true)}>Muat ulang riwayat</Button><p className="mt-2 text-xs">Catatan yang diketik tetap disimpan di formulir; status dan tanggal mengikuti pembaruan terbaru setelah dimuat ulang.</p></div>}
      {loading && <p role="status" className="text-sm text-[#627069]">Memuat riwayat tindak lanjut...</p>}
      {data && <>
        <div className="rounded-xl border border-[#e5eee9] bg-[#f9fcfa] p-3 text-sm">
          <p className="font-bold">Status saat ini: {followUpStatusLabels[data.latest?.status ?? "open"]}</p>
          <p className="mt-1 text-xs text-[#627069]">{data.latest?.followUpDate ? `Tindak lanjut berikutnya: ${displayDate(data.latest.followUpDate)}` : "Belum ada jadwal tindak lanjut."}</p>
        </div>
        <form onSubmit={save} className="space-y-3 rounded-2xl border border-[#e5eee9] p-3 sm:p-4">
          <fieldset disabled={saving || loading || needsReload} className="min-w-0 space-y-3">
            <legend className="sr-only">Tambah catatan tindak lanjut</legend>
            <div><label htmlFor={`${id}-note`} className="text-xs font-bold">Catatan internal</label><textarea id={`${id}-note`} value={note} onChange={(event) => setNote(event.target.value)} required maxLength={2000} rows={4} placeholder="Contoh: Pemilik perlu bantuan mengimpor produk. Hubungi kembali besok." className={fieldClass} /><p className="mt-1 text-right text-xs text-[#627069]">{note.length}/2.000 karakter</p></div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <div><label htmlFor={`${id}-status`} className="text-xs font-bold">Status penanganan</label><select id={`${id}-status`} value={status} onChange={(event) => { const next = event.target.value as FollowUpEntry["status"]; setStatus(next); if (next === "completed") setDate(""); }} className={fieldClass}>{Object.entries(followUpStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div><label htmlFor={`${id}-date`} className="text-xs font-bold">Tanggal tindak lanjut (opsional)</label><input id={`${id}-date`} type="date" value={date} disabled={status === "completed"} onChange={(event) => setDate(event.target.value)} className={fieldClass} />{status === "completed" && <p className="mt-1 text-xs text-[#627069]">Jadwal dikosongkan saat penanganan selesai.</p>}</div>
            </div>
            <Button type="submit" disabled={!note.trim()} className="w-full sm:w-auto">{saving ? "Menyimpan..." : "Simpan tindak lanjut"}</Button>
          </fieldset>
        </form>
        <section aria-label="Riwayat tindak lanjut" className="space-y-3">
          <h3 className="text-sm font-extrabold">Riwayat catatan ({data.pagination.total})</h3>
          {data.entries.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-center text-sm text-[#627069]">Belum ada catatan tindak lanjut.</p> : <ol className="space-y-3">{data.entries.map((entry) => <li key={entry.id} className="min-w-0 rounded-xl border border-[#e5eee9] p-3">
            <div className="flex flex-wrap justify-between gap-2 text-xs"><span className="font-bold text-[#106348]">{followUpStatusLabels[entry.status]}</span><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString("id-ID")}</time></div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{entry.note}</p>
            <p className="mt-2 break-words text-xs text-[#627069]">Dicatat oleh {entry.authorName} ({entry.authorEmail})</p>
            {entry.followUpDate && <p className="mt-1 text-xs text-[#627069]">Jadwal tindak lanjut: {displayDate(entry.followUpDate)}</p>}
          </li>)}</ol>}
          {data.pagination.totalPages > 1 && <nav aria-label="Halaman riwayat tindak lanjut" className="flex flex-wrap items-center justify-between gap-2"><Button type="button" variant="outline" disabled={loading || saving || data.pagination.page <= 1} onClick={() => void load(data.pagination.page - 1, false)}>Sebelumnya</Button><span className="text-xs">Halaman {data.pagination.page} dari {data.pagination.totalPages}</span><Button type="button" variant="outline" disabled={loading || saving || data.pagination.page >= data.pagination.totalPages} onClick={() => void load(data.pagination.page + 1, false)}>Berikutnya</Button></nav>}
        </section>
      </>}
    </div>
  );
}
