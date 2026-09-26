import { describe, expect, it } from "vitest";
import {
  PAGE_SIZE,
  INVENTORY_PAGE_SIZE,
  PRODUCTS_PAGE_SIZE,
  TRANSACTIONS_PAGE_SIZE,
  getPageNumbers,
} from "@/shared/pagination";

describe("getPageNumbers", () => {
  it("menampilkan seluruh halaman tanpa ellipsis saat jumlah halaman sedikit", () => {
    expect(getPageNumbers(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("menampilkan halaman pertama, terakhir, dan sekitar halaman aktif", () => {
    expect(getPageNumbers(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  });

  it("menghindari ellipsis ganda di dekat awal", () => {
    expect(getPageNumbers(2, 10)).toEqual([1, 2, 3, "ellipsis", 10]);
    expect(getPageNumbers(1, 10)).toEqual([1, 2, 3, "ellipsis", 10]);
  });

  it("menghindari ellipsis ganda di dekat akhir", () => {
    expect(getPageNumbers(9, 10)).toEqual([1, "ellipsis", 8, 9, 10]);
  });

  it("membatasi halaman aktif di rentang yang valid", () => {
    expect(getPageNumbers(0, 10)).toEqual(getPageNumbers(1, 10));
    expect(getPageNumbers(99, 10)).toEqual(getPageNumbers(10, 10));
  });

  it("selalu mengembalikan minimal satu halaman", () => {
    expect(getPageNumbers(3, 0)).toEqual([1]);
  });
});

describe("PAGE_SIZE", () => {
  it("memakai ukuran halaman yang wajar", () => {
    expect(PAGE_SIZE).toBeGreaterThan(0);
    expect(Number.isInteger(PAGE_SIZE)).toBe(true);
  });

  it("membatasi riwayat transaksi menjadi 10 data per halaman", () => {
    expect(TRANSACTIONS_PAGE_SIZE).toBe(10);
  });

  it("membatasi daftar produk menjadi 10 data per halaman", () => {
    expect(PRODUCTS_PAGE_SIZE).toBe(10);
  });

  it("membatasi daftar stok menjadi 10 data per halaman", () => {
    expect(INVENTORY_PAGE_SIZE).toBe(10);
  });
});
