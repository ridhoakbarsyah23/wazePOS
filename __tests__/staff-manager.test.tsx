import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffManager } from "@/components/staff-manager";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("StaffManager", () => {
  beforeEach(() => {
    refresh.mockClear();
    vi.restoreAllMocks();
  });

  it("memakai ID keanggotaan baru saat perannya langsung diubah", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "Karyawan berhasil ditambahkan.",
            staff: {
              id: "member-new",
              userId: "user-new",
              name: "Budi Santoso",
              email: "budi@contoh.com",
              role: "cashier",
              createdAt: "2026-09-21T00:00:00.000Z",
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Peran staf berhasil diperbarui." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    render(
      <StaffManager
        initialStaff={[
          {
            id: "member-owner",
            userId: "user-owner",
            name: "Pemilik",
            email: "owner@contoh.com",
            role: "owner",
            createdAt: "2026-09-20T00:00:00.000Z",
          },
        ]}
        currentUserRole="owner"
        currentUserId="user-owner"
        maxStaff={5}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /tambah karyawan/i }));
    fireEvent.change(screen.getByLabelText(/nama lengkap/i), {
      target: { value: "Budi Santoso" },
    });
    fireEvent.change(screen.getByLabelText(/alamat email/i), {
      target: { value: "budi@contoh.com" },
    });
    fireEvent.change(screen.getByLabelText(/kata sandi awal/i), {
      target: { value: "rahasia123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /buat akun karyawan/i }));

    await screen.findByText("Budi Santoso");
    const roleSelect = screen.getByTitle("Ubah peran");
    fireEvent.change(roleSelect, { target: { value: "admin" } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/staff/member-new",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });
});
