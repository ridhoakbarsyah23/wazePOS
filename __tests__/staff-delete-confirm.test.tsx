import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StaffManager } from "@/components/staff-manager";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const ownerOnly = {
  currentUserRole: "owner" as const,
  currentUserId: "user-owner",
  maxStaff: 5,
};

describe("penghapusan karyawan lewat dialog konfirmasi", () => {
  it("tidak memanggil API hapus sebelum user konfirmasi di dialog", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Akses karyawan berhasil dicabut." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    render(
      <StaffManager
        initialStaff={[
          {
            id: "member-cashier",
            userId: "user-cashier",
            name: "Cashier Satu",
            email: "cashier@contoh.com",
            role: "cashier",
            createdAt: "2026-09-21T00:00:00.000Z",
          },
        ]}
        {...ownerOnly}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /cabut akses cashier satu/i }));

    // Dialog konfirmasi muncul dan API hapus belum dipanggil.
    await screen.findByText(/Cabut akses “Cashier Satu”\?/);
    expect(fetchMock).not.toHaveBeenCalled();

    // Setelah konfirmasi di dalam dialog, DELETE baru dipanggil sekali.
    fireEvent.click(screen.getByRole("button", { name: "Cabut akses" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/staff/member-cashier",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("membatalkan penghapusan saat tombol Batal ditekan", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    render(
      <StaffManager
        initialStaff={[
          {
            id: "member-cashier",
            userId: "user-cashier",
            name: "Cashier Dua",
            email: "cashier2@contoh.com",
            role: "cashier",
            createdAt: "2026-09-21T00:00:00.000Z",
          },
        ]}
        {...ownerOnly}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /cabut akses cashier dua/i }));
    await screen.findByText(/Cabut akses “Cashier Dua”\?/);

    fireEvent.click(screen.getByRole("button", { name: "Batal" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
