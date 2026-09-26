import { describe, expect, it } from "vitest";

import { DEFAULT_RECEIPT_SETTINGS, normalizeReceiptSettings, receiptSettingsSchema } from "@/shared/validation/receipt-settings";

describe("receiptSettingsSchema", () => {
  it("menghasilkan default untuk objek kosong", () => {
    expect(DEFAULT_RECEIPT_SETTINGS).toEqual({
      headerNote: "",
      footerNote: "",
      showLogo: true,
      showCashier: true,
      showDateTime: true,
      showUnitPrice: true,
      footerMessage: "thankYou",
    });
  });

  it("menerima konfigurasi lengkap", () => {
    const result = receiptSettingsSchema.parse({
      headerNote: "Jl. Merdeka No. 10, Bandung",
      footerNote: "Barang yang sudah dibeli tidak dapat dikembalikan",
      showLogo: false,
      showCashier: false,
      showDateTime: true,
      showUnitPrice: false,
      footerMessage: "none",
    });

    expect(result.showLogo).toBe(false);
    expect(result.footerMessage).toBe("none");
    expect(result.headerNote).toBe("Jl. Merdeka No. 10, Bandung");
  });

  it("menolak footerMessage di luar pilihan", () => {
    expect(receiptSettingsSchema.safeParse({ footerMessage: "promo" }).success).toBe(false);
  });

  it("menolak catatan melebihi batas", () => {
    expect(receiptSettingsSchema.safeParse({ headerNote: "x".repeat(121) }).success).toBe(false);
  });

  it("memotong spasi di awal/akhir catatan", () => {
    const result = receiptSettingsSchema.parse({ headerNote: "  Slogan toko  " });
    expect(result.headerNote).toBe("Slogan toko");
  });
});

describe("normalizeReceiptSettings", () => {
  it("fallback ke default untuk null, undefined, atau bentuk aneh", () => {
    expect(normalizeReceiptSettings(null)).toEqual(DEFAULT_RECEIPT_SETTINGS);
    expect(normalizeReceiptSettings(undefined)).toEqual(DEFAULT_RECEIPT_SETTINGS);
    expect(normalizeReceiptSettings("bukan-objek")).toEqual(DEFAULT_RECEIPT_SETTINGS);
    expect(normalizeReceiptSettings({ showLogo: "bukan-boolean" })).toEqual(DEFAULT_RECEIPT_SETTINGS);
  });

  it("menggabungkan JSON parsial dari DB dengan default", () => {
    expect(normalizeReceiptSettings({ showCashier: false })).toEqual({
      ...DEFAULT_RECEIPT_SETTINGS,
      showCashier: false,
    });
  });
});
