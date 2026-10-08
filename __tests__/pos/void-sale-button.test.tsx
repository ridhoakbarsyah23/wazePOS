import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoidSaleButton } from "@/components/pos/void-sale-button";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

const defaultProps = {
  saleId: "sale-123",
  invoiceNumber: "INV-001",
  isVoided: false,
  canVoid: true,
};

describe("VoidSaleButton", () => {
  beforeEach(() => {
    mocks.refresh.mockReset();
    vi.useRealTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("membuka dialog pembatalan yang fokus ke alasan dan bisa ditutup dengan Escape", () => {
    vi.useFakeTimers();
    render(<VoidSaleButton {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Batalkan Transaksi" }));

    expect(screen.getByRole("dialog", { name: "Konfirmasi Pembatalan" })).toBeDefined();
    expect(screen.getByText(/INV-001/)).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(screen.getByLabelText("Alasan Pembatalan:")).toBe(document.activeElement);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Konfirmasi Pembatalan" })).toBeNull();
    expect(screen.getByRole("button", { name: "Batalkan Transaksi" })).toBe(document.activeElement);
  });

  it("mengirim alasan yang sudah dirapikan dan refresh setelah sukses", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Transaksi berhasil dibatalkan." }),
    } as Response);
    render(<VoidSaleButton {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Batalkan Transaksi" }));
    fireEvent.change(screen.getByLabelText("Alasan Pembatalan:"), {
      target: { value: "  Salah input pesanan  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ya, Batalkan Transaksi" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith("/api/sales/sale-123/void", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Salah input pesanan" }),
    });
    expect((await screen.findByRole("status")).textContent).toContain("Transaksi berhasil dibatalkan.");
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce(), { timeout: 1600 });
  });

  it("menampilkan error API dan mengaitkannya ke textarea", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Alasan pembatalan wajib diisi antara 5 sampai 200 karakter." }),
    } as Response);
    render(<VoidSaleButton {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Batalkan Transaksi" }));
    fireEvent.change(screen.getByLabelText("Alasan Pembatalan:"), {
      target: { value: "Retur pelanggan" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ya, Batalkan Transaksi" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Alasan pembatalan wajib diisi");
    expect(screen.getByLabelText("Alasan Pembatalan:").getAttribute("aria-invalid")).toBe("true");
  });
});
