"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authInputClass } from "@/components/auth/password-field";
import { authClient } from "@/shared/auth/auth-client";
import { verifyOtpSchema } from "@/shared/validation/auth";
import { normalizePlan } from "@/shared/billing/plans";

const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const plan = normalizePlan(searchParams.get("plan"));

  const [otp, setOtp] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState(
    emailParam
      ? `Kode 6 digit telah dikirim ke ${emailParam}. Masukkan kode tersebut di bawah ini.`
      : "Masukkan alamat email dan kode 6 digit yang kami kirim.",
  );
  const [isPending, setIsPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setInfoMessage("");

    const formData = new FormData(event.currentTarget);
    // Email diambil dari query param bila ada (alur register/onboarding);
    // fallback ke input manual bila halaman dibuka langsung tanpa param.
    const emailValue = (emailParam || String(formData.get("email") ?? "")).trim().toLowerCase();
    if (!emailValue) {
      setErrorMessage("Alamat email belum terisi. Kembali ke pendaftaran untuk menerima kode baru.");
      return;
    }

    const parsed = verifyOtpSchema.safeParse({ email: emailValue, otp });
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Kode verifikasi belum valid.");
      return;
    }

    setIsPending(true);
    try {
      const response = await authClient.emailOtp.verifyEmail({
        email: parsed.data.email,
        otp: parsed.data.otp,
      });

      if (response.error) {
        setErrorMessage(
          "Kode verifikasi salah, kedaluwarsa, atau sudah terlalu sering dicoba. Minta kode baru bila perlu.",
        );
        return;
      }

      setInfoMessage("Email terverifikasi. Melanjutkan ke pengaturan usaha…");
      router.replace(`/onboarding?plan=${plan}`);
      router.refresh();
    } catch {
      setErrorMessage("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleResend() {
    const emailValue = emailParam;
    if (cooldown > 0 || isResending || !emailValue) return;
    setErrorMessage("");
    setIsResending(true);
    try {
      const response = await authClient.emailOtp.sendVerificationOtp({
        email: emailValue,
        type: "email-verification",
      });
      if (response.error) {
        setErrorMessage("Kode baru belum berhasil dikirim. Tunggu sebentar lalu coba lagi.");
        return;
      }
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setInfoMessage(`Kode baru telah dikirim ke ${emailValue}. Kode berlaku sekitar 10 menit.`);
    } catch {
      setErrorMessage("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <form className="mt-5 grid min-w-0 gap-3.5 sm:mt-6" onSubmit={handleSubmit} noValidate aria-busy={isPending}>
      <div className="grid gap-2 text-xs font-bold text-[#34443d]">
        <label htmlFor="verify-email">Email</label>
        <input
          id="verify-email"
          className={authInputClass}
          type="email"
          name="email"
          defaultValue={emailParam}
          readOnly={Boolean(emailParam)}
          disabled={Boolean(emailParam)}
          required={!emailParam}
          placeholder="nama@email.com"
          aria-describedby="verify-email-hint"
        />
        <span id="verify-email-hint" className="font-semibold text-[#77837d]">
          Salah alamat? <Link href="/register" className="font-bold text-[#198760] underline underline-offset-2">Kembali daftar</Link> dengan email yang benar.
        </span>
      </div>

      <div className="grid gap-2 text-xs font-bold text-[#34443d]">
        <label htmlFor="verify-otp">Kode verifikasi 6 digit</label>
        <input
          id="verify-otp"
          className={`${authInputClass} text-center text-xl font-extrabold tracking-[0.5em]`}
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          placeholder="••••••"
          value={otp}
          disabled={isPending}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </div>

      {infoMessage && !errorMessage && (
        <p className="m-0 rounded-xl border border-[#cae8d9] bg-[#eaf7f0] px-3.5 py-3 text-xs font-semibold text-[#106348]" role="status">
          {infoMessage}
        </p>
      )}
      {errorMessage && (
        <p className="m-0 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-xs font-semibold text-red-700" role="alert" aria-live="polite">
          {errorMessage}
        </p>
      )}

      <button
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#1ba36f] to-[#147554] px-5 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(25,135,96,.25)] transition duration-200 hover:-translate-y-px hover:from-[#20ad78] hover:to-[#147554] hover:shadow-[0_12px_24px_rgba(25,135,96,.3)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/20 disabled:cursor-wait disabled:opacity-65 motion-reduce:transform-none motion-reduce:transition-none"
        type="submit"
        disabled={isPending}
      >
        {isPending && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
        {isPending ? "Memverifikasi..." : "Verifikasi email"}
      </button>

      <button
        type="button"
        onClick={() => void handleResend()}
        disabled={isResending || cooldown > 0 || !emailParam}
        className="h-11 w-full cursor-pointer rounded-xl border border-[#cfdcd5] bg-white px-4 text-sm font-bold text-[#263c33] transition duration-200 hover:border-[#94c5ad] hover:bg-[#f9fcfa] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/15 disabled:cursor-wait disabled:opacity-65"
      >
        {isResending ? "Mengirim kode baru..." : cooldown > 0 ? `Kirim ulang dalam ${cooldown} detik` : "Kirim ulang kode"}
      </button>
    </form>
  );
}
