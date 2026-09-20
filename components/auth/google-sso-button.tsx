"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { getGoogleAuthRedirects, type SocialAuthFlow } from "@/lib/social-auth";
import type { PlanId } from "@/lib/plans";

export function GoogleSsoButton({
  flow,
  selectedPlan,
  disabled = false,
}: {
  flow: SocialAuthFlow;
  selectedPlan?: PlanId;
  disabled?: boolean;
}) {
  const searchParams = useSearchParams();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const callbackError = searchParams.get("oauth") === "error" || Boolean(searchParams.get("error"));

  async function continueWithGoogle() {
    setErrorMessage("");
    setIsPending(true);

    try {
      const response = await authClient.signIn.social({
        provider: "google",
        ...getGoogleAuthRedirects(flow, selectedPlan),
      });

      if (response.error) {
        setErrorMessage("Login Google belum berhasil. Silakan coba lagi.");
        setIsPending(false);
      }
    } catch {
      setErrorMessage("Tidak dapat menghubungkan ke Google. Periksa koneksi lalu coba lagi.");
      setIsPending(false);
    }
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={() => void continueWithGoogle()}
        disabled={disabled || isPending}
        aria-busy={isPending}
        className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-[#cfdcd5] bg-white px-3 text-[15px] font-bold text-[#263c33] shadow-[0_1px_2px_rgba(16,65,48,.05)] transition hover:border-[#94c5ad] hover:bg-[#f9fcfa] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/15 disabled:cursor-wait disabled:opacity-65 sm:h-11 sm:gap-3 sm:px-5 sm:text-sm"
      >
        {isPending ? (
          <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-[#198760]/25 border-t-[#198760]" />
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
            <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.39 13.86A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.48l3.35-2.62Z" />
            <path fill="#EA4335" d="M12 6.01c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z" />
          </svg>
        )}
        {isPending ? "Menghubungkan ke Google..." : "Lanjutkan dengan Google"}
      </button>

      {(errorMessage || callbackError) && (
        <p className="m-0 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-xs font-semibold text-red-700" role="alert" aria-live="polite">
          {errorMessage || "Login Google dibatalkan atau belum berhasil. Silakan coba lagi."}
        </p>
      )}

      <div className="flex items-center gap-2 sm:gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[#e3ebe7]" />
        <span className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.1em] text-[#8a9992] min-[380px]:text-[10px] min-[380px]:tracking-[0.13em]">atau gunakan email</span>
        <span className="h-px flex-1 bg-[#e3ebe7]" />
      </div>
    </div>
  );
}
