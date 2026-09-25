import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/login-form";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  signInEmail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    signIn: {
      email: mocks.signInEmail,
    },
  },
}));

describe("LoginForm", () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.signInEmail.mockReset();
    mocks.signInEmail.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mengarahkan akun admin ke /admin setelah login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ destination: "/admin" }),
    }));

    render(<LoginForm googleSsoEnabled={false} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Kata sandi"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith("/admin");
    });
    expect(mocks.replace).not.toHaveBeenCalledWith("/dashboard");
  });

  it("tetap memakai server continuation bila tujuan gagal", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    render(<LoginForm googleSsoEnabled={false} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Kata sandi"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith("/auth/continue");
    });
  });
});
