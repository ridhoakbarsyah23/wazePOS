"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { leadStatusLabels, type LeadStatus } from "@/shared/admin/platform-admin-leads";

type SaveState = "idle" | "saved" | "error";

export function PlatformAdminLeadFollowUpForm({
  leadId,
  initialStatus,
  initialNote,
  initialDate,
}: {
  leadId: string;
  initialStatus: LeadStatus;
  initialNote: string | null;
  initialDate: string | null;
}) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<LeadStatus>(initialStatus);
  const [note, setNote] = useState(initialNote ?? "");
  const [date, setDate] = useState(initialDate ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  const trimmedNote = note.trim();
  const noteError = trimmedNote.length > 2000 ? "Catatan maksimal 2.000 karakter." : "";
  const dirty = status !== initialStatus || trimmedNote !== (initialNote ?? "") || date !== (initialDate ?? "");
  const canSave = dirty && !noteError && !isPending;

  const statusOptions = useMemo(() => Object.entries(leadStatusLabels) as [LeadStatus, string][], []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    startTransition(async () => {
      setSaveState("idle");
      setMessage("");

      try {
        const response = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            followUpNote: trimmedNote ? trimmedNote : null,
            followUpDate: date || null,
          }),
        });
        const payload = await response.json().catch(() => ({})) as { message?: string };
        if (!response.ok) throw new Error(payload.message ?? "Status lead belum dapat disimpan.");

        setSaveState("saved");
        setMessage(payload.message ?? "Status lead tersimpan.");
        router.refresh();
      } catch (error) {
        setSaveState("error");
        setMessage(error instanceof Error ? error.message : "Status lead belum dapat disimpan.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={isPending}
      className="mt-3 grid min-w-0 gap-2 rounded-xl border border-[#e3ede8] bg-[#f9fcfa] p-3 dark:border-[#303030] dark:bg-[#151515]"
    >
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-[11px] font-extrabold text-[#4d5e57] dark:text-[#d4d4d4]" htmlFor={`${id}-status`}>
          Status lead
          <select
            id={`${id}-status`}
            value={status}
            disabled={isPending}
            onChange={(event) => setStatus(event.target.value as LeadStatus)}
            className="h-11 min-w-0 rounded-lg border border-[#b8cbc1] bg-white px-3 text-xs font-semibold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 dark:border-[#303030] dark:bg-[#101010] dark:text-white"
          >
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[11px] font-extrabold text-[#4d5e57] dark:text-[#d4d4d4]" htmlFor={`${id}-date`}>
          Jadwal follow-up
          <input
            id={`${id}-date`}
            type="date"
            value={date}
            disabled={isPending}
            onChange={(event) => setDate(event.target.value)}
            className="date-picker-modern h-11 min-w-0 rounded-lg border border-[#b8cbc1] bg-white px-3 text-xs text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 dark:border-[#303030] dark:bg-[#101010] dark:text-white"
          />
        </label>
      </div>
      <label className="grid gap-1 text-[11px] font-extrabold text-[#4d5e57] dark:text-[#d4d4d4]" htmlFor={`${id}-note`}>
        Catatan follow-up
        <textarea
          id={`${id}-note`}
          value={note}
          disabled={isPending}
          onChange={(event) => setNote(event.target.value)}
          aria-describedby={noteError ? `${id}-note-error` : `${id}-form-status`}
          maxLength={2000}
          rows={2}
          className="min-h-[70px] min-w-0 resize-y rounded-lg border border-[#b8cbc1] bg-white px-3 py-2 text-xs leading-5 text-[#15211d] outline-none transition placeholder:text-[#82928a] focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 dark:border-[#303030] dark:bg-[#101010] dark:text-white dark:placeholder:text-[#737373]"
          placeholder="Contoh: Sudah dihubungi, minta demo hari Jumat."
        />
      </label>
      {noteError && <p id={`${id}-note-error`} className="m-0 text-xs font-semibold text-red-700 dark:text-red-300">{noteError}</p>}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <p
          id={`${id}-form-status`}
          className={`m-0 text-xs font-semibold ${saveState === "error" ? "text-red-700 dark:text-red-300" : saveState === "saved" ? "text-[#106348] dark:text-[#62d6a5]" : "text-[#82928a] dark:text-[#a3a3a3]"}`}
          role={saveState === "error" ? "alert" : "status"}
        >
          {message || (dirty ? "Ada perubahan belum disimpan." : "Status sudah sinkron.")}
        </p>
        <Button type="submit" size="sm" disabled={!canSave} className="h-11 w-full gap-2 px-3 text-xs sm:w-auto [&_svg]:size-3.5">
          <Save aria-hidden="true" />
          {isPending ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
