"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleGauge,
  Crown,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type StaffMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "cashier";
  createdAt: string;
};

export function StaffManager({
  initialStaff,
  currentUserRole,
  currentUserId,
  maxStaff = 2,
  planName = "Tumbuh",
}: {
  initialStaff: StaffMember[];
  currentUserRole: "owner" | "admin" | "cashier";
  currentUserId: string;
  maxStaff?: number;
  planName?: string;
}) {
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffMember[]>(initialStaff);
  const isQuotaReached = maxStaff < 999 && staffList.length >= maxStaff;
  const employeeCount = staffList.filter((member) => member.role !== "owner").length;
  const adminCount = staffList.filter((member) => member.role === "admin").length;
  const cashierCount = staffList.filter((member) => member.role === "cashier").length;
  const remainingSlots = maxStaff >= 999 ? null : Math.max(maxStaff - staffList.length, 0);
  const [isAdding, setIsAdding] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const hasPendingAction = pendingAction !== null;
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!feedback) return;

    const timeoutId = window.setTimeout(() => setFeedback(null), 15_000);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"admin" | "cashier">("cashier");

  function resetAddForm() {
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setRole("cashier");
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setPendingAction("add");

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", message: data.message ?? "Gagal menambahkan karyawan." });
        return;
      }

      setFeedback({ type: "success", message: data.message });
      setStaffList((prev) => [data.staff, ...prev]);
      resetAddForm();
      setIsAdding(false);
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "Tidak dapat terhubung ke server." });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleChangeRole(memberId: string, newRole: "admin" | "cashier") {
    setFeedback(null);
    setPendingAction(`role:${memberId}`);

    try {
      const res = await fetch(`/api/staff/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", message: data.message ?? "Gagal memperbarui peran." });
        return;
      }

      setStaffList((prev) =>
        prev.map((s) => (s.id === memberId ? { ...s, role: newRole } : s))
      );
      setFeedback({ type: "success", message: data.message });
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "Tidak dapat terhubung ke server." });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDeleteStaff(memberId: string) {
    setFeedback(null);
    setPendingAction(`delete:${memberId}`);

    try {
      const res = await fetch(`/api/staff/${memberId}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: "error", message: data.message ?? "Gagal mencabut akses." });
        return;
      }

      setStaffList((prev) => prev.filter((s) => s.id !== memberId));
      setFeedback({ type: "success", message: data.message });
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "Tidak dapat terhubung ke server." });
    } finally {
      setPendingAction(null);
    }
  }

  const roleConfigs = {
    owner: {
      label: "Owner",
      icon: Crown,
      variant: "default" as const,
    },
    admin: {
      label: "Admin Toko",
      icon: Shield,
      variant: "secondary" as const,
    },
    cashier: {
      label: "Kasir",
      icon: User,
      variant: "outline" as const,
    },
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold transition-all ${
            feedback.type === "success"
              ? "border-[#cae8d9] bg-[#eaf7f0] text-[#106348]"
              : "border-[#f2d4b9] bg-[#fff0e5] text-[#a35f12]"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0 text-[#198760]" />
          ) : (
            <AlertTriangle className="size-5 shrink-0 text-[#a35f12]" />
          )}
          <div className="min-w-0 flex-1">
            <p>{feedback.message}</p>
            <p className="mt-1 text-[11px] font-medium opacity-75">
              Notifikasi akan tertutup otomatis dalam 15 detik.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="grid size-8 shrink-0 place-items-center rounded-lg transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30"
            aria-label="Tutup notifikasi"
            title="Tutup notifikasi"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Plan quota banner if quota reached */}
      {isQuotaReached && (
        <Card className="border-[#f2d4b9] bg-[#fffaf5]">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff0e5] text-[#a35f12]">
                <Lock className="size-5" />
              </span>
              <div>
                <p className="font-extrabold text-[#15211d]">
                  Kuota {maxStaff} Akun Tim Tercapai ({planName})
                </p>
                <p className="m-0 text-xs text-[#627069]">
                  Kuota menghitung pemilik dan karyawan. Tingkatkan ke <strong>Paket Bisnis</strong> untuk menambah anggota tim.
                </p>
              </div>
            </div>
            <Button asChild variant="default" size="sm">
              <Link href="/subscription">Upgrade ke Bisnis</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <section aria-label="Ringkasan tim" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Karyawan", value: employeeCount, helper: "Di luar akun pemilik", icon: Users, tone: "bg-emerald-50 text-emerald-700 border-emerald-100" },
          { label: "Admin Toko", value: adminCount, helper: "Akses operasional", icon: ShieldCheck, tone: "bg-blue-50 text-blue-700 border-blue-100" },
          { label: "Kasir", value: cashierCount, helper: "Akses terminal POS", icon: UserCheck, tone: "bg-amber-50 text-amber-700 border-amber-100" },
          { label: "Slot Tersedia", value: remainingSlots === null ? "∞" : remainingSlots, helper: `Paket ${planName}`, icon: CircleGauge, tone: "bg-violet-50 text-violet-700 border-violet-100" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-[#dfe8e3] bg-white p-3.5 shadow-[0_4px_16px_rgba(16,65,48,.04)] sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#718078] sm:text-[11px]">{item.label}</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-[#15211d]">{item.value}</p>
                </div>
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl border ${item.tone}`}>
                  <Icon className="size-4" />
                </span>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-[#718078] sm:text-[11px]">{item.helper}</p>
            </div>
          );
        })}
      </section>

      {/* Action Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-[0_4px_16px_rgba(16,65,48,.04)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-extrabold tracking-[-0.6px] text-[#15211d]">
              Daftar Karyawan ({employeeCount})
            </h2>
            <Badge variant="outline">
              Akun tim: {staffList.length} / {maxStaff >= 999 ? "∞" : maxStaff} ({planName})
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[#627069]">
            {remainingSlots === null
              ? "Tambahkan kasir atau admin sesuai kebutuhan operasional."
              : remainingSlots > 0
                ? `${remainingSlots} slot akun masih tersedia, termasuk akun pemilik.`
                : "Seluruh slot akun pada paket ini sudah digunakan."}
          </p>
        </div>

        {!isQuotaReached ? (
          <Button
            disabled={hasPendingAction}
            onClick={() => {
              if (isAdding) resetAddForm();
              setFeedback(null);
              setIsAdding(!isAdding);
            }}
            variant={isAdding ? "outline" : "default"}
            className="h-11 w-full rounded-xl px-4 sm:w-auto"
          >
            {isAdding ? (
              <>
                <X className="size-4" /> Tutup Formulir
              </>
            ) : (
              <>
                <UserPlus className="size-4" /> Tambah Karyawan
              </>
            )}
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="border-amber-300 text-amber-800 hover:bg-amber-50">
            <Link href="/subscription">Upgrade untuk Tambah Karyawan</Link>
          </Button>
        )}
      </div>

      {/* Form Tambah Karyawan */}
      {isAdding && !isQuotaReached && (
        <Card className="overflow-hidden rounded-3xl border-[#63b792]/40 bg-white shadow-[0_14px_40px_rgba(16,65,48,.10)] animate-in fade-in duration-200">
          <CardHeader className="border-b border-emerald-800/20 bg-gradient-to-br from-[#126b4b] via-[#198760] to-[#23a473] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/15 text-white">
                <UserPlus className="size-5" />
              </span>
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-emerald-100">
                  <Sparkles className="size-3.5" /> Akun Kerja Baru
                </div>
                <CardTitle className="text-lg text-white">Tambah Karyawan</CardTitle>
              </div>
            </div>
            <CardDescription className="mt-3 max-w-2xl text-xs leading-5 text-emerald-50/90">
              Isi identitas, tentukan hak akses, lalu bagikan kredensial awal melalui saluran yang aman.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handleAddStaff} className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
              <section className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                <div className="flex items-center gap-3 border-b border-[#e7eeea] pb-4 sm:col-span-2">
                  <span className="grid size-8 place-items-center rounded-full bg-[#198760] text-xs font-black text-white">1</span>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#15211d]">Identitas akun</h3>
                    <p className="text-[11px] text-[#718078]">Data yang digunakan karyawan untuk masuk.</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="staff-name" className="flex items-center gap-1.5 text-xs font-bold">
                    <User className="size-3.5 text-[#198760]" /> Nama Lengkap *
                  </Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#758a80]" />
                    <Input id="staff-name" placeholder="Contoh: Budi Santoso" value={name} onChange={(e) => setName(e.target.value)} required disabled={pendingAction === "add"} autoFocus autoComplete="name" className="h-11 rounded-xl bg-white pl-9" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="staff-email" className="flex items-center gap-1.5 text-xs font-bold">
                    <Mail className="size-3.5 text-[#198760]" /> Alamat Email *
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#758a80]" />
                    <Input id="staff-email" type="email" placeholder="budi@contoh.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={pendingAction === "add"} autoComplete="email" className="h-11 rounded-xl bg-white pl-9" />
                  </div>
                  <p className="text-[11px] leading-5 text-[#758a80]">Menjadi identitas masuk karyawan.</p>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="staff-password" className="flex items-center gap-1.5 text-xs font-bold">
                    <Lock className="size-3.5 text-[#198760]" /> Kata Sandi Awal *
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#758a80]" />
                    <Input id="staff-password" type={showPassword ? "text" : "password"} placeholder="Minimal 8 karakter" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required disabled={pendingAction === "add"} autoComplete="new-password" className="h-11 rounded-xl bg-white pl-9 pr-11" />
                    <button type="button" onClick={() => setShowPassword((prev) => !prev)} title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"} aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"} className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-[#758a80] transition hover:bg-[#edf7f2] hover:text-[#198760] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#198760]">
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] leading-5 text-[#758a80]">Minimal 8 karakter dan hanya dibagikan kepada pemilik akun.</p>
                </div>
              </section>

              <section className="border-t border-[#e2ece6] bg-[#f7faf8] p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div className="mb-4 flex items-center gap-3 border-b border-[#e0e9e4] pb-4">
                  <span className="grid size-8 place-items-center rounded-full bg-[#198760] text-xs font-black text-white">2</span>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#15211d]">Hak akses</h3>
                    <p className="text-[11px] text-[#718078]">Pilih sesuai tanggung jawab karyawan.</p>
                  </div>
                </div>

                <fieldset>
                  <legend className="sr-only">Peran dan hak akses</legend>
                  <div className="grid gap-2.5">
                    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${role === "cashier" ? "border-[#198760] bg-[#eaf7f0] shadow-[0_4px_14px_rgba(25,135,96,.10)]" : "border-[#dbe5df] bg-white hover:border-[#b8cbc1]"}`}>
                      <input type="radio" name="staff-role" value="cashier" checked={role === "cashier"} onChange={() => setRole("cashier")} disabled={pendingAction === "add"} className="mt-1 accent-[#198760]" />
                      <span><strong className="block text-sm text-[#15211d]">Kasir</strong><span className="text-[11px] leading-5 text-[#627069]">Akses terminal POS untuk melayani transaksi.</span></span>
                    </label>
                    {currentUserRole === "owner" && (
                      <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${role === "admin" ? "border-[#198760] bg-[#eaf7f0] shadow-[0_4px_14px_rgba(25,135,96,.10)]" : "border-[#dbe5df] bg-white hover:border-[#b8cbc1]"}`}>
                        <input type="radio" name="staff-role" value="admin" checked={role === "admin"} onChange={() => setRole("admin")} disabled={pendingAction === "add"} className="mt-1 accent-[#198760]" />
                        <span><strong className="block text-sm text-[#15211d]">Admin Toko</strong><span className="text-[11px] leading-5 text-[#627069]">Kelola produk, stok, laporan, dan karyawan kasir.</span></span>
                      </label>
                    )}
                  </div>
                </fieldset>

                <div className="mt-4 rounded-2xl border border-[#dce8e2] bg-white p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#718078]">Pratinjau akun</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#15211d] text-sm font-black text-white">{(name.trim().slice(0, 1) || "K").toUpperCase()}</span>
                    <div className="min-w-0"><p className="truncate text-sm font-extrabold text-[#15211d]">{name.trim() || "Nama karyawan"}</p><p className="truncate text-[11px] text-[#718078]">{email.trim() || "email@karyawan.com"}</p></div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#f2f7f4] px-3 py-2 text-[11px] font-bold text-[#3f5148]">
                    {role === "admin" ? <ShieldCheck className="size-3.5 text-blue-600" /> : <UserCheck className="size-3.5 text-amber-600" />}
                    {role === "admin" ? "Admin Toko · Akses operasional" : "Kasir · Akses terminal POS"}
                  </div>
                </div>
              </section>

              <div className="flex flex-col-reverse gap-2 border-t border-[#e2ece6] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:col-span-2">
                <p className="text-[11px] leading-5 text-[#718078]">Karyawan bisa langsung masuk setelah akun berhasil dibuat.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" className="h-11 flex-1 rounded-xl sm:flex-none" onClick={() => { resetAddForm(); setIsAdding(false); }} disabled={pendingAction === "add"}>Batal</Button>
                  <Button type="submit" className="h-11 flex-1 rounded-xl px-5 sm:flex-none" disabled={hasPendingAction}>
                    {pendingAction === "add" && <Loader2 className="size-4 animate-spin" />}
                    {pendingAction === "add" ? "Membuat akun..." : "Buat Akun Karyawan"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Staff Table */}
      <Card className="overflow-hidden rounded-3xl border-[#dfe8e3] shadow-[0_6px_24px_rgba(16,65,48,.05)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#e7eeea] bg-gradient-to-r from-white to-[#f4faf7] px-4 py-4 sm:px-5">
          <div>
            <h3 className="text-sm font-extrabold text-[#15211d]">Akun Tim Aktif</h3>
            <p className="mt-0.5 text-[11px] text-[#718078]">Ubah peran atau cabut akses langsung dari daftar.</p>
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
            <Users className="size-4" />
          </span>
        </div>
        <div className="grid gap-3 p-3 md:hidden">
          {staffList.map((member) => {
            const config = roleConfigs[member.role] ?? roleConfigs.cashier;
            const RoleIcon = config.icon;
            const isCurrentUser = member.userId === currentUserId;
            const deletePending = pendingAction === `delete:${member.id}`;
            const rolePending = pendingAction === `role:${member.id}`;

            return (
              <article key={member.id} className="rounded-2xl border border-[#e0e9e4] bg-white p-4 shadow-[0_4px_14px_rgba(16,65,48,.04)]">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#198760] to-[#126b4b] text-sm font-black text-white shadow-sm">
                    {member.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="truncate text-sm font-extrabold text-[#15211d]">{member.name}</h4>
                      {isCurrentUser && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">Anda</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-[#627069]">{member.email}</p>
                  </div>
                  <Badge variant={config.variant} className="shrink-0 gap-1 text-[10px]">
                    <RoleIcon className="size-3" /> {config.label}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#edf2ef] pt-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-[#7a8981]">
                    <CalendarDays className="size-3" />
                    {new Date(member.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </span>

                  <div className="flex items-center gap-2">
                    {currentUserRole === "owner" && member.role !== "owner" && (
                      <>
                        <select
                          value={member.role}
                          onChange={(event) => void handleChangeRole(member.id, event.target.value as "admin" | "cashier")}
                          disabled={hasPendingAction}
                          className="h-9 rounded-xl border border-[#dbe5df] bg-[#f8faf9] px-2.5 text-xs font-bold text-[#405149] outline-none focus:border-[#198760]"
                          title="Ubah peran versi mobile"
                          aria-label={`Ubah peran ${member.name}`}
                        >
                          <option value="cashier">Kasir</option>
                          <option value="admin">Admin</option>
                        </select>
                        <ConfirmationDialog
                          title={`Cabut akses “${member.name}”?`}
                          description="Karyawan ini tidak akan dapat mengakses bisnis lagi. Akun pengguna dan histori transaksi tetap aman."
                          confirmLabel="Cabut akses"
                          disabled={hasPendingAction}
                          onConfirm={() => void handleDeleteStaff(member.id)}
                          trigger={
                            <Button type="button" variant="ghost" size="sm" disabled={hasPendingAction} className="size-9 rounded-xl p-0 text-rose-600 hover:bg-rose-50" aria-label={`Cabut akses ${member.name}`}>
                              {deletePending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            </Button>
                          }
                        />
                      </>
                    )}
                    {currentUserRole === "admin" && member.role === "cashier" && (
                      <ConfirmationDialog
                        title={`Cabut akses “${member.name}”?`}
                        description="Kasir ini tidak akan dapat mengakses bisnis lagi. Akun pengguna dan histori transaksi tetap aman."
                        confirmLabel="Cabut akses"
                        disabled={hasPendingAction}
                        onConfirm={() => void handleDeleteStaff(member.id)}
                        trigger={
                          <Button type="button" variant="outline" size="sm" disabled={hasPendingAction} className="h-9 rounded-xl border-rose-200 text-xs text-rose-600 hover:bg-rose-50">
                            {deletePending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Cabut
                          </Button>
                        }
                      />
                    )}
                    {rolePending && <Loader2 className="size-4 animate-spin text-[#198760]" />}
                    {member.role === "owner" && <span className="text-[10px] font-bold text-[#7a8981]">Akun pemilik</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Karyawan</TableHead>
                <TableHead className="hidden font-bold md:table-cell">Alamat Email</TableHead>
                <TableHead className="text-center font-bold">Peran Akses</TableHead>
                <TableHead className="hidden font-bold lg:table-cell">Bergabung</TableHead>
                <TableHead className="text-right font-bold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffList.map((member) => {
                const config = roleConfigs[member.role] ?? roleConfigs.cashier;
                const RoleIcon = config.icon;
                const isCurrentUser = member.userId === currentUserId;
                const rolePending = pendingAction === `role:${member.id}`;
                const deletePending = pendingAction === `delete:${member.id}`;

                return (
                  <TableRow key={member.id} className="transition-colors hover:bg-[#f8fbf9]">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-gradient-to-br from-[#eaf7f0] to-[#dff2e8] text-sm font-extrabold text-[#198760] shadow-sm">
                          {member.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-[#15211d]">{member.name}</span>
                            {isCurrentUser && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 font-bold">
                                Anda
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 max-w-40 truncate text-[11px] text-[#627069] md:hidden">
                            {member.email}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[#8a9891] lg:hidden">
                            Bergabung {new Date(member.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden text-xs text-[#52645c] md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Mail className="size-3 text-[#758a80]" />
                        <span>{member.email}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant={config.variant} className="gap-1 inline-flex items-center">
                        <RoleIcon className="size-3" />
                        <span>{config.label}</span>
                      </Badge>
                    </TableCell>

                    <TableCell className="hidden text-xs text-[#627069] lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="size-3 text-[#758a80]" />
                        <span>
                          {new Date(member.createdAt).toLocaleDateString("id-ID", {
                            dateStyle: "medium",
                          })}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex min-w-24 flex-col items-end justify-end gap-1.5 sm:flex-row sm:items-center">
                        {/* Owner can modify non-owner roles */}
                        {currentUserRole === "owner" && member.role !== "owner" && (
                          <>
                            <select
                              value={member.role}
                              onChange={(e) =>
                                handleChangeRole(member.id, e.target.value as "admin" | "cashier")
                              }
                              disabled={hasPendingAction}
                              className="h-8 rounded-lg border border-[#dbe5df] bg-white px-2 text-xs font-semibold text-[#4d5e57] outline-none"
                              title="Ubah peran"
                            >
                              <option value="cashier">Kasir</option>
                              <option value="admin">Admin</option>
                            </select>

                            <ConfirmationDialog
                              title={`Cabut akses “${member.name}”?`}
                              description="Karyawan ini tidak akan dapat mengakses bisnis lagi. Akun pengguna dan histori transaksi yang sudah tercatat tetap aman."
                              confirmLabel="Cabut akses"
                              disabled={hasPendingAction}
                              onConfirm={() => void handleDeleteStaff(member.id)}
                              trigger={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={hasPendingAction}
                                  className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50"
                                  title="Cabut akses"
                                >
                                  {deletePending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                                </Button>
                              }
                            />
                          </>
                        )}

                        {/* Admin can remove cashier */}
                        {currentUserRole === "admin" && member.role === "cashier" && (
                          <ConfirmationDialog
                            title={`Cabut akses “${member.name}”?`}
                            description="Kasir ini tidak akan dapat mengakses bisnis lagi. Akun pengguna dan histori transaksi yang sudah tercatat tetap aman."
                            confirmLabel="Cabut akses"
                            disabled={hasPendingAction}
                            onConfirm={() => void handleDeleteStaff(member.id)}
                            trigger={
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={hasPendingAction}
                                className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50"
                                title="Cabut akses kasir"
                              >
                                {deletePending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                              </Button>
                            }
                          />
                        )}

                        {rolePending && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#627069]">
                            <Loader2 className="size-3 animate-spin" /> Menyimpan
                          </span>
                        )}

                        {member.role === "owner" && (
                          <span className="text-[11px] font-semibold text-[#758a80]">Akun pemilik</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {staffList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-[#627069]">
                    Belum ada staf terdaftar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
