import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileManager } from "@/components/account/profile-manager";

const authMocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
  changePassword: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/shared/auth/auth-client", () => ({
  authClient: {
    updateUser: authMocks.updateUser,
    changePassword: authMocks.changePassword,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: authMocks.refresh }),
}));

const defaultProps = {
  initialName: "Rina Pratama",
  email: "rina@example.com",
  roleLabel: "Admin Gerai",
  businessName: "Antigravity Coffee",
  canChangePassword: true,
};

describe("ProfileManager", () => {
  beforeEach(() => {
    authMocks.updateUser.mockReset();
    authMocks.changePassword.mockReset();
    authMocks.refresh.mockReset();
  });

  it("updates a trimmed account name and refreshes server data", async () => {
    authMocks.updateUser.mockResolvedValue({ error: null });
    render(<ProfileManager {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Nama lengkap"), {
      target: { value: "  Rina Maharani  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan nama" }));

    await waitFor(() => {
      expect(authMocks.updateUser).toHaveBeenCalledWith({ name: "Rina Maharani" });
    });
    expect(await screen.findByText("Nama akun berhasil diperbarui.")).toBeDefined();
    expect(authMocks.refresh).toHaveBeenCalledOnce();
  });

  it("changes a credential password and revokes other sessions by default", async () => {
    authMocks.changePassword.mockResolvedValue({ error: null });
    render(<ProfileManager {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Kata sandi saat ini"), {
      target: { value: "rahasia-lama" },
    });
    fireEvent.change(screen.getByLabelText("Kata sandi baru"), {
      target: { value: "rahasia-baru" },
    });
    fireEvent.change(screen.getByLabelText("Konfirmasi kata sandi"), {
      target: { value: "rahasia-baru" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ubah kata sandi" }));

    await waitFor(() => {
      expect(authMocks.changePassword).toHaveBeenCalledWith({
        currentPassword: "rahasia-lama",
        newPassword: "rahasia-baru",
        revokeOtherSessions: true,
      });
    });
    expect(await screen.findByText("Kata sandi berhasil diperbarui.")).toBeDefined();
  });

  it("explains password management for provider-only accounts", () => {
    render(<ProfileManager {...defaultProps} canChangePassword={false} />);

    expect(screen.getByText("Akun terhubung ke penyedia login")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Ubah kata sandi" })).toBeNull();
  });
});
