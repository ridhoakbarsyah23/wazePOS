"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { GoogleSsoButton } from "@/components/auth/google-sso-button";
import { authInputClass, PasswordField } from "@/components/auth/password-field";
import { authClient } from "@/lib/auth/auth-client";
import { loginSchema } from "@/lib/validation/auth";

type FieldErrors = Partial<Record<"email" | "password", string>>;

export function LoginForm({ googleSsoEnabled }: { googleSsoEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, startNavigation] = useTransition();
  // Tetap "pending" selama proses verifikasi akun DAN sampai navigasi ke
  // dashboard selesai, supaya spinner tidak menghilang di tengah transisi.
  const isPending = isSubmitting || isNavigating;

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
      const nextErrors = { email: errors.email?.[0], password: errors.password?.[0] };
      setFieldErrors(nextErrors);
      // Pro Max ux: focusable error summary — fokus ke ringkasan error agar
      // keyboard/screen reader langsung menemukan masalahnya.
      requestAnimationFrame(() => {
        document.getElementById("login-error-summary")?.focus();
      });
      return;
    }

    setIsSubmitting(true);
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

      // Gunakan server continuation sebagai fallback agar sesi tetap diproses
      // di server meskipun request tujuan gagal atau tidak dapat diproses.
      let destination = "/auth/continue";
      try {
        const destinationResponse = await fetch("/api/auth/destination", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });
        if (destinationResponse.ok) {
          const payload = await destinationResponse.json() as { destination?: unknown };
          if (payload.destination === "/admin" || payload.destination === "/dashboard") {
            destination = payload.destination;
          }
        }
      } catch {
        // Server continuation akan menentukan tujuan dari sesi yang baru dibuat.
      }

      // Navigasi dibungkus useTransition: isNavigating tetap true sampai
      // halaman tujuan selesai dirender, sehingga animasi loading tidak terputus.
      startNavigation(() => {
        router.replace(destination);
      });
    } catch {
      setErrorMessage("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-5 grid min-w-0 gap-3.5 sm:mt-6" onSubmit={handleSubmit} noValidate aria-busy={isPending}>
      {googleSsoEnabled && <GoogleSsoButton flow="login" disabled={isPending} />}

      {(fieldErrors.email || fieldErrors.password || errorMessage) && (
        <div
          id="login-error-summary"
          role="alert"
          tabIndex={-1}
          aria-labelledby="login-error-title"
          className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
        >
          <p id="login-error-title" className="m-0 text-xs font-extrabold text-red-800">
            Periksa kembali data masuk Anda
          </p>
          <ul className="m-0 mt-1.5 grid list-none gap-1 p-0 text-xs font-semibold text-red-700">
            {fieldErrors.email && (
              <li>
                <a href="#login-email" className="underline underline-offset-2 hover:text-red-800">Email: {fieldErrors.email}</a>
              </li>
            )}
            {fieldErrors.password && (
              <li>
                <a href="#login-password" className="underline underline-offset-2 hover:text-red-800">Kata sandi: {fieldErrors.password}</a>
              </li>
            )}
            {!fieldErrors.email && !fieldErrors.password && errorMessage && <li>{errorMessage}</li>}
          </ul>
        </div>
      )}
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

      <div className="flex flex-col items-start gap-2 text-xs min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
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

      {errorMessage && !fieldErrors.email && !fieldErrors.password && <p className="m-0 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-xs font-semibold text-red-700" role="alert" aria-live="polite">{errorMessage}</p>}

      <button className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#1ba36f] to-[#147554] px-5 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(25,135,96,.25)] transition duration-200 hover:-translate-y-px hover:from-[#20ad78] hover:to-[#147554] hover:shadow-[0_12px_24px_rgba(25,135,96,.3)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/20 disabled:cursor-wait disabled:opacity-65 motion-reduce:transform-none motion-reduce:transition-none" type="submit" disabled={isPending}>
        {isPending && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
        {isPending ? "Memeriksa akun..." : "Masuk"}
      </button>
    </form>
  );
}
