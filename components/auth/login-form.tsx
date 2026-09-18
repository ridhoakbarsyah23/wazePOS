"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { authInputClass, PasswordField } from "@/components/auth/password-field";
import { authClient } from "@/lib/auth-client";
import { loginSchema } from "@/lib/validation/auth";

type FieldErrors = Partial<Record<"email" | "password", string>>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  function clearError(field: keyof FieldErrors) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setErrorMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const result = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      setFieldErrors({ email: errors.email?.[0], password: errors.password?.[0] });
      return;
    }

    setIsPending(true);
    try {
      const response = await authClient.signIn.email({
        email: result.data.email,
        password: result.data.password,
        rememberMe: formData.get("rememberMe") === "on",
      });

      if (response.error) {
        setErrorMessage("Email atau kata sandi tidak sesuai.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="mt-7 grid gap-4" onSubmit={handleSubmit} noValidate aria-busy={isPending}>
      <div className="grid gap-2 text-xs font-bold text-[#34443d]">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          className={`${authInputClass} ${fieldErrors.email ? "!border-red-400 !ring-4 !ring-red-100" : ""}`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder="nama@email.com"
          disabled={isPending}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
          onInput={() => clearError("email")}
        />
        {fieldErrors.email && <span id="login-email-error" className="font-semibold text-red-600">{fieldErrors.email}</span>}
      </div>

      <PasswordField
        id="login-password"
        name="password"
        label="Kata sandi"
        placeholder="Masukkan kata sandi"
        autoComplete="current-password"
        disabled={isPending}
        error={fieldErrors.password}
        onInput={() => clearError("password")}
      />

      <div className="flex items-center justify-between text-xs">
        <label className="flex cursor-pointer items-center gap-2 font-semibold text-[#5e6d65]">
          <input
            name="rememberMe"
            type="checkbox"
            defaultChecked
            disabled={isPending}
            className="size-4 accent-[#198760]"
          />
          Tetap masuk
        </label>
        <Link
          href="/forgot-password"
          className="font-bold text-[#198760] hover:text-[#116b4c] hover:underline transition-colors"
        >
          Lupa kata sandi?
        </Link>
      </div>

      {searchParams.get("reset") === "success" && (
        <div className="flex items-center gap-2 rounded-xl border border-[#cae8d9] bg-[#eaf7f0] p-3.5 text-xs font-semibold text-[#106348]">
          <CheckCircle2 className="size-4 shrink-0 text-[#198760]" />
          <span>Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.</span>
        </div>
      )}

      {errorMessage && <p className="m-0 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-xs font-semibold text-red-700" role="alert" aria-live="polite">{errorMessage}</p>}

      <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#198760] px-5 text-sm font-extrabold text-white transition hover:bg-[#116b4c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/20 disabled:cursor-wait disabled:opacity-65" type="submit" disabled={isPending}>
        {isPending && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
        {isPending ? "Memeriksa akun..." : "Masuk"}
      </button>
    </form>
  );
}
