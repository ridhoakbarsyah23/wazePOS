import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({ guard: vi.fn(), select: vi.fn() }));
vi.mock("@/server/admin/platform-admin", () => ({ requirePlatformAdmin: mocks.guard }));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));

import { getPlatformAdminUsers } from "@/server/admin/platform-admin-users";

function mockDatabase(total: number) {
  const countWhere = vi.fn().mockResolvedValue([{ total }]);
  const offset = vi.fn().mockResolvedValue([{
    id: "user-1", name: "Akun baru", email: "new@example.com", emailVerified: false,
    createdAt: new Date(), updatedAt: new Date(), privacyAcceptedAt: null,
    businessName: null, role: null,
  }]);
  const limit = vi.fn(() => ({ offset }));
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn<(condition: unknown) => { orderBy: typeof orderBy }>(() => ({ orderBy }));
  const joins = { leftJoin: vi.fn(), where };
  joins.leftJoin.mockReturnValue(joins);
  mocks.select
    .mockReturnValueOnce({ from: vi.fn(() => ({ where: countWhere })) })
    .mockReturnValueOnce({ from: vi.fn(() => joins) });
  return { countWhere, offset, limit, where };
}

describe("Direktori akun Platform Admin", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.guard.mockResolvedValue({ user: { id: "admin" } }); });

  it("menolak akses sebelum membaca data akun", async () => {
    mocks.guard.mockRejectedValue(new Error("unauthorized"));
    await expect(getPlatformAdminUsers({})).rejects.toThrow("unauthorized");
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("mempertahankan akun tanpa usaha dan membatasi halaman ke rentang tersedia", async () => {
    const db = mockDatabase(21);
    const result = await getPlatformAdminUsers({ page: "999" });
    expect(result.pagination).toEqual({ total: 21, page: 3, totalPages: 3, from: 21, to: 21 });
    expect(db.limit).toHaveBeenCalledWith(10);
    expect(db.offset).toHaveBeenCalledWith(20);
    expect(result.users[0]).toMatchObject({ businessName: null, role: null, emailVerified: false, isPlatformAdmin: false });
  });

  it("menggunakan pencarian literal yang sama untuk hitungan dan daftar", async () => {
    const db = mockDatabase(1);
    const result = await getPlatformAdminUsers({ q: ["  nama_%  ", "ignored"], page: "invalid" });
    expect(result.query).toBe("nama_%");
    expect(result.pagination.page).toBe(1);
    expect(db.where.mock.calls[0][0]).toBe(db.countWhere.mock.calls[0][0]);
    const compiled = new PgDialect().sqlToQuery(db.countWhere.mock.calls[0][0]);
    expect(compiled.params).toEqual(["%nama\\_\\%%", "%nama\\_\\%%"]);
    expect(compiled.sql).not.toContain("nama");
  });

  it("menangani direktori kosong tanpa rentang negatif", async () => {
    const db = mockDatabase(0);
    db.offset.mockResolvedValue([]);
    const result = await getPlatformAdminUsers({ page: "-3" });
    expect(result.users).toEqual([]);
    expect(result.pagination).toEqual({ total: 0, page: 1, totalPages: 1, from: 0, to: 0 });
  });
});
