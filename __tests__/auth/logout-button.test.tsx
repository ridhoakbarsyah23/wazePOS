import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogoutButton } from "@/components/auth/logout-button";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

vi.mock("@/shared/auth/auth-client", () => ({
  authClient: { signOut: mocks.signOut },
}));

describe("LogoutButton", () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.refresh.mockReset();
    mocks.signOut.mockReset();
    mocks.signOut.mockResolvedValue(undefined);
  });

  it("menampilkan alert kustom tanpa confirm browser", () => {
    const browserConfirm = vi.spyOn(window, "confirm");
    render(<LogoutButton />);

    fireEvent.click(screen.getByTitle("Keluar dari akun"));

    expect(screen.getByTestId("logout-dialog")).toBeDefined();
    expect(screen.getByTestId("logout-dialog").parentElement).toBe(document.body);
    expect(screen.getByRole("alertdialog")).toBeDefined();
    expect(screen.getByText("Keluar dari wazePOS?")).toBeDefined();
    expect(browserConfirm).not.toHaveBeenCalled();
    browserConfirm.mockRestore();
  });

  it("menjalankan logout setelah konfirmasi", async () => {
    render(<LogoutButton />);

    fireEvent.click(screen.getByTitle("Keluar dari akun"));
    fireEvent.click(screen.getByRole("button", { name: "Ya, Keluar" }));

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    expect(mocks.replace).toHaveBeenCalledWith("/login");
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
});
