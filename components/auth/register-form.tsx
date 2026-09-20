"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authInputClass, PasswordField } from "@/components/auth/password-field";
import { GoogleSsoButton } from "@/components/auth/google-sso-button";
import { authClient } from "@/lib/auth-client";
import { registerSchema } from "@/lib/validation/auth";
import { plans, type PlanId } from "@/lib/plans";

type FieldName = "name" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

export function RegisterForm({
  selectedPlan,
  googleSsoEnabled,
}: {
  selectedPlan: PlanId;
  googleSsoEnabled: boolean;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanId>(selectedPlan);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  function clearError(field: FieldName) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setErrorMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const result = registerSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      setFieldErrors({
        name: errors.name?.[0],
        email: errors.email?.[0],
        password: errors.password?.[0],
        confirmPassword: errors.confirmPassword?.[0],
      });
      return;
    }

    setIsPending(true);
    try {
      const response = await authClient.signUp.email({
        name: result.data.name,
        email: result.data.email,
        password: result.data.password,
      });

      if (response.error) {
        setErrorMessage(response.error.status === 422 || response.error.status === 400
          ? "Email sudah digunakan atau data akun belum valid."
          : "Akun belum berhasil dibuat. Silakan coba lagi.");
        return;
      }

      router.replace(`/onboarding?plan=${plan}`);
      router.refresh();
    } catch {
      setErrorMessage("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="mt-6 grid gap-3.5" onSubmit={handleSubmit} noValidate aria-busy={isPending}>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-xs font-extrabold text-[#34443d]">Pilih paket uji coba</legend>
        <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
          {(["tumbuh", "bisnis"] as const).map((planId) => {
            const selected = plan === planId;
            return (
              <button
                key={planId}
                type="button"
                disabled={isPending}
                aria-pressed={selected}
                onClick={() => {
                  setPlan(planId);
                  window.history.replaceState(null, "", `/register?plan=${planId}`);
                }}
                className={`relative rounded-xl border px-3.5 py-3 text-left transition ${selected ? "border-[#198760] bg-[#f0faf5] shadow-[0_0_0_3px_rgba(25,135,96,.08)]" : "border-[#dbe5df] bg-white hover:border-[#9dcbb7] hover:bg-[#fbfdfc]"}`}
              >
                <span className={`block pr-5 text-xs font-extrabold ${selected ? "text-[#106348]" : "text-[#34443d]"}`}>Paket {plans[planId].name}</span>
                <span className="mt-1 block text-[10px] font-medium text-[#77837d]">Rp {plans[planId].annualPrice.toLocaleString("id-ID")} / tahun</span>
                <span className={`absolute right-3 top-3 grid size-4 place-items-center rounded-full border ${selected ? "border-[#198760] bg-[#198760] text-white" : "border-[#cbd9d2] text-transparent"}`}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-2.5 fill-none stroke-current" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
      {googleSsoEnabled && <GoogleSsoButton flow="register" selectedPlan={plan} disabled={isPending} />}

      <div className="grid gap-2 text-xs font-bold text-[#34443d]">
        <label htmlFor="register-name">Nama lengkap</label>
        <input id="register-name" className={`${authInputClass} ${fieldErrors.name ? "!border-red-400 !ring-4 !ring-red-100" : ""}`} name="name" type="text" autoComplete="name" required placeholder="Nama lengkap Anda" disabled={isPending} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "register-name-error" : undefined} onInput={() => clearError("name")} />
        {fieldErrors.name && <span id="register-name-error" className="font-semibold text-red-600">{fieldErrors.name}</span>}
      </div>

      <div className="grid gap-2 text-xs font-bold text-[#34443d]">
        <label htmlFor="register-email">Email</label>
        <input id="register-email" className={`${authInputClass} ${fieldErrors.email ? "!border-red-400 !ring-4 !ring-red-100" : ""}`} name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required placeholder="nama@email.com" disabled={isPending} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "register-email-error" : undefined} onInput={() => clearError("email")} />
        {fieldErrors.email && <span id="register-email-error" className="font-semibold text-red-600">{fieldErrors.email}</span>}
      </div>

      <PasswordField id="register-password" name="password" label="Kata sandi" placeholder="Minimal 8 karakter" autoComplete="new-password" disabled={isPending} error={fieldErrors.password} onInput={() => clearError("password")} />
      <PasswordField id="register-confirm-password" name="confirmPassword" label="Konfirmasi kata sandi" placeholder="Ulangi kata sandi" autoComplete="new-password" disabled={isPending} error={fieldErrors.confirmPassword} onInput={() => clearError("confirmPassword")} />

      {errorMessage && <p className="m-0 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-xs font-semibold text-red-700" role="alert" aria-live="polite">{errorMessage}</p>}

      <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#198760] px-5 text-[15px] font-extrabold text-white shadow-[0_8px_18px_rgba(25,135,96,.2)] transition hover:bg-[#116b4c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/20 disabled:cursor-wait disabled:opacity-65 sm:h-11 sm:text-sm" type="submit" disabled={isPending}>
        {isPending && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
        {isPending ? "Membuat akun..." : "Buat akun"}
      </button>
    </form>
  );
}
