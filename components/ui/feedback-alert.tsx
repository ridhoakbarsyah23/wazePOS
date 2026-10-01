"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";

export type FeedbackData = {
  type: "success" | "error";
  message: string;
};

type FeedbackAlertProps = {
  feedback: FeedbackData | null;
  feedbackKey: number;
  onDismiss: () => void;
};

export function FeedbackAlert({ feedback, feedbackKey, onDismiss }: FeedbackAlertProps) {
  if (!feedback) return null;

  return (
    <div
      key={feedbackKey}
      role="status"
      aria-live="polite"
      className={`relative flex items-start gap-3 overflow-hidden rounded-2xl border p-4 text-sm font-semibold shadow-sm animate-toast-in ${
        feedback.type === "success"
          ? "border-[#cae8d9] bg-[#eaf7f0] text-[#106348]"
          : "border-[#f2d4b9] bg-[#fff0e5] text-[#a35f12]"
      }`}
    >
      {feedback.type === "success" ? (
        <CheckCircle2 className="size-5 shrink-0 text-[#198760]" />
      ) : (
        <AlertTriangle className="size-5 shrink-0 text-[#a35f12]" />
      )}
      <span className="flex-1">{feedback.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Tutup notifikasi"
        className="shrink-0 rounded-lg p-0.5 opacity-60 transition hover:opacity-100"
      >
        <X className="size-4" />
      </button>
      {/* Progress bar 15 detik */}
      <span className="absolute bottom-0 left-0 h-[3px] bg-current opacity-30 animate-progress-15" />
    </div>
  );
}
