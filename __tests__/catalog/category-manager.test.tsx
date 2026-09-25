import { cloneElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CategoryManager } from "@/components/catalog/category-manager";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/components/ui/confirmation-dialog", () => ({
  ConfirmationDialog: ({
    trigger,
    onConfirm,
  }: {
    trigger: React.ReactNode;
    onConfirm: () => void;
  }) =>
    cloneElement(
      trigger as React.ReactElement<{ onClick?: () => void }>,
      { onClick: onConfirm },
    ),
}));

const initialCategories = [
  { id: "category-1", name: "Minuman", productCount: 4 },
  { id: "category-2", name: "Makanan", productCount: 2 },
];

function renderManager() {
  return render(<CategoryManager initialCategories={initialCategories} />);
}

describe("CategoryManager", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.restoreAllMocks();
  });

  it("menampilkan daftar kategori dan jumlah produk", () => {
    renderManager();

    expect(screen.getByText("Minuman")).toBeDefined();
    expect(screen.getByText("Makanan")).toBeDefined();
    expect(screen.getByText("4 produk terkait")).toBeDefined();
    expect(screen.getByText("2 produk terkait")).toBeDefined();
  });

  it("menambah kategori melalui API dan menampilkannya di daftar", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: "Kategori \"Snack\" berhasil dibuat.",
          category: { id: "category-3", name: "Snack", productCount: 0 },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    renderManager();
    fireEvent.change(screen.getByLabelText("Nama kategori"), { target: { value: "Snack" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan kategori/i }));

    await waitFor(() => expect(screen.getByText("Snack")).toBeDefined());

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/categories",
      expect.objectContaining({ method: "POST" }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("mengubah nama kategori dan menghapus kategori setelah konfirmasi", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "Kategori berhasil diperbarui.",
            category: { id: "category-1", name: "Minuman Segar" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Kategori berhasil dihapus." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    renderManager();
    fireEvent.click(screen.getByRole("button", { name: "Ubah nama kategori Minuman" }));
    fireEvent.change(screen.getByLabelText("Ubah nama kategori Minuman"), {
      target: { value: "Minuman Segar" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));

    await waitFor(() => expect(screen.getByText("Minuman Segar")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: `Hapus kategori Minuman Segar` }));

    await waitFor(() => expect(screen.queryByText("Minuman Segar")).toBeNull());
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/categories/category-1", expect.objectContaining({ method: "PATCH" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/categories/category-1", { method: "DELETE" });
  });
});
