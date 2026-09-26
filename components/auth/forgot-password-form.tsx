"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Info, LoaderCircle, Mail } from "lucide-react";
import { authInputClass } from "@/components/auth/password-field";
import { authClient } from "@/lib/auth/auth-client";
import { forgotPasswordSchema } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setErrorMessage("Masukkan alamat email yang valid.");
      return;
    }

    setIsPending(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email: result.data.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setErrorMessage("Permintaan gagal. Silakan tunggu sebentar lalu coba lagi.");
        return;
      }

      setSuccessMessage(
        "Jika email terdaftar, tautan atur ulang kata sandi akan dikirim ke email tersebut.",
      );
    } catch {
      setErrorMessage("Tidak dapat terhubung ke server. Silakan periksa koneksi Anda.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mt-5 min-w-0 sm:mt-6">
      {successMessage ? (
        <div className="animate-in fade-in space-y-4 duration-200">
          <div className="flex items-start gap-3 rounded-2xl border border-[#cae8d9] bg-[#eaf7f0] p-4 text-sm text-[#106348]">
            <CheckCircle2 className="size-5 shrink-0 text-[#198760] mt-0.5" />
            <div>
              <p className="font-extrabold text-[#106348]">Permintaan Berhasil</p>
              <p className="mt-1 text-xs text-[#198760] leading-relaxed">
                {successMessage}
              </p>
            </div>
          </div>

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
        <form className="grid min-w-0 gap-3.5" onSubmit={handleSubmit} noValidate aria-busy={isPending}>
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
            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#1ba36f] to-[#147554] px-5 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(25,135,96,.25)] transition duration-200 hover:-translate-y-px hover:from-[#20ad78] hover:to-[#147554] hover:shadow-[0_12px_24px_rgba(25,135,96,.3)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/20 disabled:cursor-wait disabled:opacity-65 motion-reduce:transform-none motion-reduce:transition-none"
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
