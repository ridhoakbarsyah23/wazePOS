"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authInputClass, PasswordField } from "@/components/auth/password-field";
import { authClient } from "@/lib/auth-client";
import { registerSchema } from "@/lib/validation/auth";
import { plans, type PlanId } from "@/lib/plans";

type FieldName = "name" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

export function RegisterForm({ selectedPlan }: { selectedPlan: PlanId }) {
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
    <form className="mt-7 grid gap-4" onSubmit={handleSubmit} noValidate aria-busy={isPending}>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-xs font-bold text-[#34443d]">Pilih paket uji coba</legend>
        <div className="grid grid-cols-2 gap-2">
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
                className={`rounded-xl border px-3 py-3 text-left transition ${selected ? "border-[#198760] bg-[#f1fbf6] ring-2 ring-[#198760]/10" : "border-[#dbe5df] bg-white hover:border-[#9dcbb7]"}`}
              >
                <span className={`block text-xs font-extrabold ${selected ? "text-[#106348]" : "text-[#34443d]"}`}>{plans[planId].name}</span>
                <span className="mt-1 block text-[10px] text-[#77837d]">Rp {plans[planId].annualPrice.toLocaleString("id-ID")}/tahun</span>
              </button>
            );
          })}
        </div>
      </fieldset>
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

      <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#198760] px-5 text-sm font-extrabold text-white transition hover:bg-[#116b4c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/20 disabled:cursor-wait disabled:opacity-65" type="submit" disabled={isPending}>
        {isPending && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
        {isPending ? "Membuat akun..." : "Buat akun"}
      </button>
    </form>
  );
}
