"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Info, LoaderCircle, Mail } from "lucide-react";
import { authInputClass } from "@/components/auth/password-field";
import { forgotPasswordSchema } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    token?: string;
  } | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessInfo(null);

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setErrorMessage("Masukkan alamat email yang valid.");
      return;
    }

    setIsPending(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: result.data.email }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.message ?? "Permintaan gagal. Silakan coba lagi.");
        return;
      }

      setSuccessInfo({
        message: data.message,
        token: data.token,
      });
    } catch {
      setErrorMessage("Tidak dapat terhubung ke server. Silakan periksa koneksi Anda.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mt-7">
      {successInfo ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3 rounded-2xl border border-[#cae8d9] bg-[#eaf7f0] p-4 text-sm text-[#106348]">
            <CheckCircle2 className="size-5 shrink-0 text-[#198760] mt-0.5" />
            <div>
              <p className="font-extrabold text-[#106348]">Permintaan Berhasil</p>
              <p className="mt-1 text-xs text-[#198760] leading-relaxed">
                {successInfo.message}
              </p>
            </div>
          </div>

          {/* Direct Link to reset password */}
          {successInfo.token && (
            <div className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-sm space-y-3">
              <p className="text-xs font-bold text-[#15211d]">
                Atur Ulang Kata Sandi Langsung:
              </p>
              <Link
                href={`/reset-password?token=${successInfo.token}`}
                className="flex items-center justify-between rounded-xl bg-[#198760] px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#116b4c] transition"
              >
                <span>Lanjut ke Formulir Reset Sandi</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          )}

          <div className="flex items-start gap-2.5 rounded-xl border border-[#e4ebe7] bg-[#fafcfb] p-3.5 text-xs text-[#627069]">
            <Info className="size-4 shrink-0 text-[#198760] mt-0.5" />
            <p className="m-0 leading-relaxed">
              <strong>Tips Akun Karyawan:</strong> Jika Anda staf kasir atau admin gerai, Anda juga dapat meminta Pemilik Toko (Owner) untuk mereset kata sandi Anda langsung dari menu Karyawan.
            </p>
          </div>

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="text-xs font-bold text-[#198760] hover:underline"
            >
              Kembali ke Halaman Masuk
            </Link>
          </div>
        </div>
      ) : (
        <form className="grid gap-4" onSubmit={handleSubmit} noValidate aria-busy={isPending}>
          <div className="grid gap-2 text-xs font-bold text-[#34443d]">
            <label htmlFor="forgot-email">Alamat Email Terdaftar</label>
            <div className="relative">
              <input
                id="forgot-email"
                className={`${authInputClass} pl-10`}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage("");
                }}
                disabled={isPending}
              />
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#82928a]" />
            </div>
          </div>

          {errorMessage && (
            <p
              className="m-0 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-xs font-semibold text-red-700"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <button
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#198760] px-5 text-sm font-extrabold text-white transition hover:bg-[#116b4c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/20 disabled:cursor-wait disabled:opacity-65"
            type="submit"
            disabled={isPending || !email}
          >
            {isPending && <LoaderCircle className="size-4 animate-spin" />}
            {isPending ? "Memproses..." : "Kirim Instruksi Reset"}
          </button>
        </form>
      )}
    </div>
  );
}
