"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { PasswordField } from "@/components/auth/password-field";
import { authClient } from "@/shared/auth/auth-client";
import { accountProfileSchema, changePasswordSchema } from "@/shared/validation/profile";

type Notice = { type: "success" | "error"; message: string } | null;

export function ProfileManager({
  initialName,
  email,
  roleLabel,
  businessName,
  canChangePassword,
}: {
  initialName: string;
  email: string;
  roleLabel: string;
  businessName: string;
  canChangePassword: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [profilePending, setProfilePending] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileNotice(null);

    const parsed = accountProfileSchema.safeParse({ name });
    if (!parsed.success) {
      setProfileNotice({ type: "error", message: parsed.error.issues[0]?.message ?? "Nama tidak valid." });
      return;
    }

    setProfilePending(true);
    try {
      const { error } = await authClient.updateUser({ name: parsed.data.name });
      if (error) {
        setProfileNotice({ type: "error", message: "Nama akun gagal diperbarui. Silakan coba lagi." });
        return;
      }

      setName(parsed.data.name);
      setSavedName(parsed.data.name);
      setProfileNotice({ type: "success", message: "Nama akun berhasil diperbarui." });
      router.refresh();
    } catch {
      setProfileNotice({ type: "error", message: "Tidak dapat terhubung ke server." });
    } finally {
      setProfilePending(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordNotice(null);

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
      revokeOtherSessions,
    });
    if (!parsed.success) {
      setPasswordNotice({
        type: "error",
        message: parsed.error.issues[0]?.message ?? "Periksa kembali kata sandi Anda.",
      });
      return;
    }

    setPasswordPending(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: parsed.data.revokeOtherSessions,
      });
      if (error) {
        setPasswordNotice({
          type: "error",
          message:
            error.code === "INVALID_PASSWORD"
              ? "Kata sandi saat ini tidak sesuai."
              : "Kata sandi gagal diperbarui. Silakan coba lagi.",
        });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice({ type: "success", message: "Kata sandi berhasil diperbarui." });
    } catch {
      setPasswordNotice({ type: "error", message: "Tidak dapat terhubung ke server." });
    } finally {
      setPasswordPending(false);
    }
  }

  const initial = name.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.82fr)] lg:items-start">
      <form onSubmit={saveProfile} noValidate className="overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_24px_rgba(16,65,48,.05)]">
        <div className="flex items-center gap-3 border-b border-[#edf2ee] bg-[#fafcfb] px-4 py-4 sm:px-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eaf7f0] text-sm font-extrabold text-[#198760]">
            {initial}
          </span>
          <div className="min-w-0">
            <h2 className="m-0 text-base font-extrabold text-[#15211d]">Informasi pribadi</h2>
            <p className="m-0 mt-0.5 text-xs text-[#6c7a73]">Identitas yang digunakan pada aktivitas akun dan transaksi.</p>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-6">
          <label className="grid gap-1.5 text-xs font-bold text-[#44534c]" htmlFor="profile-name">
            Nama lengkap
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#82928a]" />
              <input
                id="profile-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setProfileNotice(null);
                }}
                required
                maxLength={80}
                autoComplete="name"
                disabled={profilePending}
                className="h-11 w-full rounded-xl border border-[#d8e3dd] bg-white pl-10 pr-3 text-sm font-semibold text-[#15211d] outline-none transition focus:border-[#198760] focus:ring-4 focus:ring-[#198760]/10 disabled:opacity-60"
              />
            </div>
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-[#44534c]" htmlFor="profile-email">
            Email akun
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#82928a]" />
              <input
                id="profile-email"
                value={email}
                readOnly
                aria-describedby="profile-email-help"
                className="h-11 w-full rounded-xl border border-[#e1e7e4] bg-[#f6f8f7] pl-10 pr-3 text-sm text-[#627069] outline-none"
              />
            </div>
            <span id="profile-email-help" className="font-medium leading-5 text-[#82928a]">
              Perubahan email memerlukan proses verifikasi untuk melindungi akun.
            </span>
          </label>

          {profileNotice && (
            <div role={profileNotice.type === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs font-semibold ${profileNotice.type === "success" ? "border-[#cae8d9] bg-[#eaf7f0] text-[#106348]" : "border-[#f3c8c4] bg-[#fff2f1] text-[#a4382f]"}`}>
              {profileNotice.type === "success" && <CheckCircle2 className="size-4 shrink-0" />}
              <span>{profileNotice.message}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-[#edf2ee] bg-[#fafcfb] px-4 py-3 sm:px-6">
          <button
            type="submit"
            disabled={profilePending || name.trim().length < 2 || name.trim() === savedName}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#198760] px-5 text-sm font-bold text-white transition hover:bg-[#116b4c] disabled:cursor-not-allowed disabled:bg-[#c8d0cc] sm:w-auto"
          >
            {profilePending && <LoaderCircle className="size-4 animate-spin" />}
            {profilePending ? "Menyimpan..." : "Simpan nama"}
          </button>
        </div>
      </form>

      <aside className="grid gap-4 rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-[0_8px_24px_rgba(16,65,48,.05)] sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="m-0 text-sm font-extrabold text-[#15211d]">Akses akun</h2>
            <p className="m-0 mt-0.5 text-xs text-[#6c7a73]">Informasi hak akses Anda saat ini.</p>
          </div>
        </div>
        <dl className="grid gap-3">
          <div className="rounded-xl bg-[#f7faf8] p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[#82928a]">Peran</dt>
            <dd className="m-0 mt-1 text-sm font-extrabold text-[#15211d]">{roleLabel}</dd>
          </div>
          <div className="rounded-xl bg-[#f7faf8] p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-[#82928a]">Ruang kerja</dt>
            <dd className="m-0 mt-1 truncate text-sm font-extrabold text-[#15211d]" title={businessName}>{businessName}</dd>
          </div>
        </dl>
        <p className="m-0 flex items-start gap-2 text-[11px] leading-5 text-[#71857c]">
          <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-[#198760]" />
          Perubahan peran hanya dapat dilakukan oleh pengelola usaha yang berwenang.
        </p>
      </aside>

      <section className="overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_24px_rgba(16,65,48,.05)] lg:col-span-2">
        <div className="flex items-center gap-3 border-b border-[#edf2ee] bg-[#fafcfb] px-4 py-4 sm:px-6">
          <span className="grid size-10 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
            <KeyRound className="size-5" />
          </span>
          <div>
            <h2 className="m-0 text-base font-extrabold text-[#15211d]">Keamanan akun</h2>
            <p className="m-0 mt-0.5 text-xs text-[#6c7a73]">Kelola kata sandi dan sesi login akun.</p>
          </div>
        </div>

        {canChangePassword ? (
          <form onSubmit={changePassword} noValidate className="grid gap-5 p-4 sm:p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <PasswordField id="current-password" name="currentPassword" label="Kata sandi saat ini" placeholder="Masukkan kata sandi saat ini" autoComplete="current-password" disabled={passwordPending} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
              <PasswordField id="new-profile-password" name="newPassword" label="Kata sandi baru" placeholder="Minimal 8 karakter" autoComplete="new-password" disabled={passwordPending} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
              <PasswordField id="confirm-profile-password" name="confirmPassword" label="Konfirmasi kata sandi" placeholder="Ulangi kata sandi baru" autoComplete="new-password" disabled={passwordPending} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-[#e1e7e4] bg-[#fafbfa] p-3 text-xs text-[#44534c]">
              <input type="checkbox" checked={revokeOtherSessions} onChange={(event) => setRevokeOtherSessions(event.target.checked)} disabled={passwordPending} className="mt-0.5 size-4 shrink-0 accent-[#198760]" />
              <span><strong className="block text-[#15211d]">Keluar dari perangkat lain</strong><span className="mt-0.5 block leading-5 text-[#71857c]">Akhiri sesi lain setelah kata sandi berhasil diubah.</span></span>
            </label>

            {passwordNotice && (
              <div role={passwordNotice.type === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs font-semibold ${passwordNotice.type === "success" ? "border-[#cae8d9] bg-[#eaf7f0] text-[#106348]" : "border-[#f3c8c4] bg-[#fff2f1] text-[#a4382f]"}`}>
                {passwordNotice.type === "success" && <CheckCircle2 className="size-4 shrink-0" />}
                <span>{passwordNotice.message}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button type="submit" disabled={passwordPending || !currentPassword || !newPassword || !confirmPassword} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#b8d6c7] bg-white px-5 text-sm font-bold text-[#106348] transition hover:bg-[#eef6f2] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                {passwordPending && <LoaderCircle className="size-4 animate-spin" />}
                {passwordPending ? "Memperbarui..." : "Ubah kata sandi"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start gap-3 p-4 sm:p-6">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#198760]" />
            <div>
              <p className="m-0 text-sm font-bold text-[#15211d]">Akun terhubung ke penyedia login</p>
              <p className="m-0 mt-1 text-xs leading-5 text-[#627069]">Kata sandi dikelola melalui penyedia akun yang digunakan saat masuk.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

