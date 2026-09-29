import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformAdminUsersPage from "@/app/admin/users/page";

const { getUsers } = vi.hoisted(() => ({ getUsers: vi.fn() }));
vi.mock("@/server/admin/platform-admin-users", () => ({ getPlatformAdminUsers: getUsers }));

const account = {
  id: "user-1", name: "Akun Baru", email: "new@example.com", emailVerified: false,
  createdAt: new Date("2026-09-29T00:00:00Z"), updatedAt: new Date("2026-09-29T00:00:00Z"),
  privacyAcceptedAt: null, businessName: null, role: null, isPlatformAdmin: false,
};

describe("Halaman daftar akun", () => {
  beforeEach(() => {
    getUsers.mockResolvedValue({ query: "", users: [account], pagination: { total: 1, from: 1, to: 1, page: 1, totalPages: 1 } });
  });

  it("menampilkan akun belum terverifikasi dan detail akun dalam modal", async () => {
    render(await PlatformAdminUsersPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "Daftar akun" })).toBeDefined();
    expect(screen.getAllByText("new@example.com").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Email belum terverifikasi")).toBeDefined();
    const trigger = screen.getByRole("button", { name: /Detail akun/ });
    expect(trigger).toBeDefined();
    // Konten detail tetap dirender di dalam dialog agar tersedia saat modal dibuka.
    expect(trigger.parentElement?.textContent).toContain("Belum terhubung ke usaha");
    expect(trigger.parentElement?.textContent).toContain("Belum tercatat");
    expect(screen.queryByRole("link", { name: "Berikutnya" })).toBeNull();
  });

  it("mempertahankan pencarian ketika pindah halaman", async () => {
    getUsers.mockResolvedValue({ query: "nama & email", users: [account], pagination: { total: 21, from: 11, to: 20, page: 2, totalPages: 3 } });
    render(await PlatformAdminUsersPage({ searchParams: Promise.resolve({ q: "nama & email", page: "2" }) }));
    expect(screen.getByRole("link", { name: "Berikutnya" }).getAttribute("href")).toBe("/admin/users?page=3&q=nama+%26+email");
    expect(screen.getByRole("link", { name: "Sebelumnya" }).getAttribute("href")).toBe("/admin/users?page=1&q=nama+%26+email");
    expect(screen.getByRole("search").getAttribute("method")).toBe("get");
  });

  it("menjelaskan pencarian kosong dan menyediakan reset", async () => {
    getUsers.mockResolvedValue({ query: "tidakada", users: [], pagination: { total: 0, from: 0, to: 0, page: 1, totalPages: 1 } });
    render(await PlatformAdminUsersPage({ searchParams: Promise.resolve({ q: "tidakada" }) }));
    expect(screen.getByText("Tidak ada akun yang sesuai dengan pencarian.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Reset" }).getAttribute("href")).toBe("/admin/users");
  });
});
