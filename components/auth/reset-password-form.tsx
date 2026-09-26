"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { PasswordField } from "@/components/auth/password-field";
import { authClient } from "@/shared/auth/auth-client";
import { resetPasswordSchema } from "@/shared/validation/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const result = resetPasswordSchema.safeParse({
      token,
      password,
      confirmPassword,
    });

    if (!result.success) {
      const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
      setErrorMessage(firstError ?? "Periksa kembali kata sandi Anda.");
      return;
    }

    setIsPending(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: result.data.password,
        token: result.data.token,
      });

      if (error) {
        setErrorMessage(
          "Tautan reset kata sandi tidak valid, sudah digunakan, atau telah kedaluwarsa.",
        );
        return;
      }

      setIsSuccess(true);
      window.setTimeout(() => {
        router.replace("/login?reset=success");
      }, 1500);
    } catch {
      setErrorMessage("Tidak dapat terhubung ke server. Silakan coba lagi.");
    } finally {
      setIsPending(false);
    }
  }

  if (!token) {
    return (
      <div className="mt-7 space-y-4 text-center">
        <p className="text-xs text-rose-600 font-semibold">
          Tautan reset tidak valid atau token tidak ditemukan.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block rounded-xl bg-[#198760] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#116b4c]"
        >
          Minta Tautan Baru
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-5 min-w-0 sm:mt-6">
      {isSuccess ? (
        <div className="animate-in fade-in space-y-3 text-center duration-200">
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#cae8d9] bg-[#eaf7f0] p-4 text-sm text-[#106348] font-bold">
            <CheckCircle2 className="size-5 text-[#198760]" />
            <span>Kata sandi berhasil diperbarui!</span>
          </div>
          <p className="text-xs text-[#627069]">
            Mengalihkan Anda ke halaman masuk dalam beberapa detik...
          </p>
        </div>
      ) : (
        <form className="grid min-w-0 gap-3.5" onSubmit={handleSubmit} noValidate aria-busy={isPending}>
          <PasswordField
            id="new-password"
            name="password"
            label="Kata Sandi Baru"
            placeholder="Minimal 8 karakter"
            autoComplete="new-password"
            disabled={isPending}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <PasswordField
            id="confirm-password"
            name="confirmPassword"
            label="Konfirmasi Kata Sandi Baru"
            placeholder="Ulangi kata sandi baru"
            autoComplete="new-password"
            disabled={isPending}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

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
            disabled={isPending || !password || !confirmPassword}
          >
            {isPending && <LoaderCircle className="size-4 animate-spin" />}
            {isPending ? "Menyimpan..." : "Simpan Kata Sandi Baru"}
          </button>
        </form>
      )}
    </div>
  );
}
