import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CustomerManager } from "@/components/customers/customer-manager";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Stub ConfirmationDialog agar trigger langsung menjalankan onConfirm.
vi.mock("@/components/ui/confirmation-dialog", () => ({
  ConfirmationDialog: ({
    trigger,
    onConfirm,
  }: {
    trigger: React.ReactNode;
    onConfirm: () => void;
  }) => (
    <button type="button" onClick={onConfirm}>
      {trigger}
    </button>
  ),
}));

const baseCustomer = {
  id: "customer-1",
  name: "Bu Sari",
  phone: "081234567890",
  email: "sari@contoh.com",
  note: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  transactionCount: 3,
  totalSpent: 150000,
  lastVisitAt: "2026-09-20T00:00:00.000Z",
};

function renderManager(overrides: Partial<Parameters<typeof CustomerManager>[0]> = {}) {
  return render(
    <CustomerManager
      initialCustomers={overrides.initialCustomers ?? [baseCustomer]}
      maxCustomers={overrides.maxCustomers ?? 100}
    />,
  );
}

describe("CustomerManager", () => {
  it("merender statistik dan kartu pelanggan dengan format rupiah", () => {
    renderManager();

    expect(screen.getByText("Bu Sari")).toBeDefined();
    // Kartu pelanggan dan kartu statistik sama-sama menampilkan total ini.
    expect(screen.getAllByText("Rp 150.000").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("3×")).toBeDefined();
    expect(screen.getByText("Total Pelanggan")).toBeDefined();
  });

  it("menambah pelanggan baru tanpa crash meski payload API tanpa field statistik", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: "Pelanggan \"Andi\" berhasil ditambahkan.",
          // Sengaja meniru respons lama: tanpa transactionCount/totalSpent/lastVisitAt.
          customer: {
            id: "customer-2",
            name: "Andi",
            phone: null,
            email: null,
            note: null,
            createdAt: "2026-09-23T00:00:00.000Z",
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    renderManager();

    fireEvent.click(screen.getByRole("button", { name: /tambah pelanggan/i }));
    fireEvent.change(screen.getByLabelText(/nama pelanggan/i), { target: { value: "Andi" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan pelanggan/i }));

    await waitFor(() => {
      expect(screen.getByText("Andi")).toBeDefined();
    });

    // Kartu pelanggan baru menampilkan nilai default, bukan crash.
    expect(screen.getByText("Rp 0")).toBeDefined();
    expect(screen.getByText("Pelanggan \"Andi\" berhasil ditambahkan.")).toBeDefined();
  });

  it("menghapus pelanggan setelah konfirmasi", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Pelanggan berhasil dihapus." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderManager();

    fireEvent.click(screen.getByRole("button", { name: /hapus bu sari/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/customers/customer-1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("Bu Sari")).toBeNull();
    });
  });
});
