"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [isAdding, setIsAdding] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"admin" | "cashier">("cashier");

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setPending(true);

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
      setStaffList((prev) => [
        {
          id: data.staff.id,
          userId: data.staff.id,
          name: data.staff.name,
          email: data.staff.email,
          role: data.staff.role,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setName("");
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setRole("cashier");
      setIsAdding(false);
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "Tidak dapat terhubung ke server." });
    } finally {
      setPending(false);
    }
  }

  async function handleChangeRole(memberId: string, newRole: "admin" | "cashier") {
    setFeedback(null);
    setPending(true);

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
      setPending(false);
    }
  }

  async function handleDeleteStaff(memberId: string, memberName: string) {
    if (!confirm(`Apakah Anda yakin ingin mencabut akses karyawan "${memberName}"?`)) return;

    setFeedback(null);
    setPending(true);

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
      setPending(false);
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
          role="status"
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
          <span>{feedback.message}</span>
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
                  Batas Kuota {maxStaff} Akun Staf Tercapai ({planName})
                </p>
                <p className="m-0 text-xs text-[#627069]">
                  Tingkatkan ke <strong>Paket Bisnis</strong> untuk menambahkan kasir dan admin tanpa batas kuota.
                </p>
              </div>
            </div>
            <Button asChild variant="default" size="sm">
              <a href="/subscription">Upgrade ke Bisnis</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold tracking-[-0.6px] text-[#15211d]">
              Daftar Staf ({staffList.length})
            </h2>
            <Badge variant="outline">
              Kuota: {staffList.length} / {maxStaff >= 999 ? "∞" : maxStaff} ({planName})
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[#627069]">
            Kelola hak akses kasir, admin, dan pemilik usaha.
          </p>
        </div>

        {!isQuotaReached ? (
          <Button
            onClick={() => setIsAdding(!isAdding)}
            variant={isAdding ? "outline" : "default"}
            size="sm"
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
            <a href="/subscription">Upgrade untuk Tambah Staf</a>
          </Button>
        )}
      </div>

      {/* Form Tambah Karyawan */}
      {isAdding && !isQuotaReached && (
        <Card className="border-[#63b792]/40 bg-[#f9fcfa] shadow-sm animate-in fade-in duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="size-4 text-[#198760]" /> Tambah Akun Karyawan Baru
            </CardTitle>
            <CardDescription className="text-xs">
              Karyawan dapat langsung masuk menggunakan email dan kata sandi yang Anda buatkan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddStaff} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="staff-name" className="text-xs font-bold flex items-center gap-1.5">
                  <User className="size-3.5 text-[#198760]" /> Nama Lengkap *
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <User className="size-4 text-[#758a80]" />
                  </div>
                  <Input
                    id="staff-name"
                    placeholder="Contoh: Budi Santoso"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={pending}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-email" className="text-xs font-bold flex items-center gap-1.5">
                  <Mail className="size-3.5 text-[#198760]" /> Alamat Email *
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="size-4 text-[#758a80]" />
                  </div>
                  <Input
                    id="staff-email"
                    type="email"
                    placeholder="budi@contoh.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={pending}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-password" className="text-xs font-bold flex items-center gap-1.5">
                  <Lock className="size-3.5 text-[#198760]" /> Kata Sandi Awal *
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="size-4 text-[#758a80]" />
                  </div>
                  <Input
                    id="staff-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    disabled={pending}
                    className="pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#758a80] hover:text-[#198760] transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-role" className="text-xs font-bold flex items-center gap-1.5">
                  <Shield className="size-3.5 text-[#198760]" /> Peran / Hak Akses *
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Shield className="size-4 text-[#758a80]" />
                  </div>
                  <select
                    id="staff-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as "admin" | "cashier")}
                    className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white pl-9 pr-3 text-sm font-semibold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10"
                    disabled={pending}
                  >
                    <option value="cashier">Kasir (Hanya Akses Terminal POS)</option>
                    {currentUserRole === "owner" && (
                      <option value="admin">Admin Toko (Akses Operasional Lengkap)</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2 pt-2 flex justify-end gap-2 border-t border-[#e2ece6]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                  disabled={pending}
                >
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Menyimpan..." : "Simpan Karyawan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Staff Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Karyawan</TableHead>
                <TableHead className="font-bold">Alamat Email</TableHead>
                <TableHead className="text-center font-bold">Peran Akses</TableHead>
                <TableHead className="font-bold">Bergabung</TableHead>
                <TableHead className="text-right font-bold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffList.map((member) => {
                const config = roleConfigs[member.role] ?? roleConfigs.cashier;
                const RoleIcon = config.icon;
                const isCurrentUser = member.userId === currentUserId;

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eaf7f0] text-sm font-extrabold text-[#198760]">
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
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-[#52645c]">
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

                    <TableCell className="text-xs text-[#627069]">
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
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Owner can modify non-owner roles */}
                        {currentUserRole === "owner" && member.role !== "owner" && (
                          <>
                            <select
                              value={member.role}
                              onChange={(e) =>
                                handleChangeRole(member.id, e.target.value as "admin" | "cashier")
                              }
                              disabled={pending}
                              className="h-8 rounded-lg border border-[#dbe5df] bg-white px-2 text-xs font-semibold text-[#4d5e57] outline-none"
                              title="Ubah peran"
                            >
                              <option value="cashier">Kasir</option>
                              <option value="admin">Admin</option>
                            </select>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={pending}
                              onClick={() => handleDeleteStaff(member.id, member.name)}
                              className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50"
                              title="Cabut akses"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </>
                        )}

                        {/* Admin can remove cashier */}
                        {currentUserRole === "admin" && member.role === "cashier" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={pending}
                            onClick={() => handleDeleteStaff(member.id, member.name)}
                            className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50"
                            title="Cabut akses kasir"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
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
