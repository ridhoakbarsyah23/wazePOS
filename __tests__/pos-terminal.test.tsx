import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PosTerminal } from "@/components/pos-terminal";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

const terminalProps = {
  products: [
    {
      id: "product-1",
      name: "Kopi Susu",
      sku: "KOPI-001",
      sellingPrice: 10_000,
      categoryName: "Minuman",
      stock: 5,
      trackStock: true,
    },
  ],
  outlets: [{ id: "outlet-1", name: "Gerai Utama" }],
  initialOutletId: "outlet-1",
  allowNonCashPayments: false,
  allowQrisPayments: false,
  checkoutDisabledReason: null,
};

function renderTerminal() {
  return render(<PosTerminal {...terminalProps} />);
}

function addProduct() {
  const productName = screen.getByText("Kopi Susu");
  fireEvent.click(productName.closest("button") as HTMLButtonElement);
}

describe("PosTerminal", () => {
  beforeEach(() => {
    refresh.mockClear();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("meminta konfirmasi sebelum mengosongkan seluruh pesanan", async () => {
    renderTerminal();
    addProduct();

    fireEvent.click(screen.getByRole("button", { name: "Kosongkan" }));

    expect(await screen.findByText("Kosongkan seluruh pesanan?")).toBeDefined();
    expect(screen.getByText("1 item dipilih")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Kosongkan pesanan" }));

    await waitFor(() => {
      expect(screen.getByText("0 item dipilih")).toBeDefined();
    });
    expect(screen.getByText("Pesanan berhasil dikosongkan.")).toBeDefined();
  });

  it("tidak menghapus pesanan ketika tombol Escape ditekan", () => {
    renderTerminal();
    addProduct();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.getByText("1 item dipilih")).toBeDefined();
    expect(screen.getByText(/Pesanan tidak dikosongkan/)).toBeDefined();
  });

  it("menyegarkan data server setelah transaksi berhasil", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          saleId: "sale-1",
          invoiceNumber: "INV-001",
          total: 10_000,
          changeAmount: 0,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    renderTerminal();
    addProduct();
    fireEvent.keyDown(window, { key: "F9" });
    fireEvent.click(screen.getByRole("button", { name: /Bayar tunai/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/sales",
        expect.objectContaining({ method: "POST" }),
      );
      expect(refresh).toHaveBeenCalledOnce();
    });
    expect(screen.getByText("0 item dipilih")).toBeDefined();
  });
});
