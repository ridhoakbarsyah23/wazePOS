import { describe, expect, it } from "vitest";
import { customerSchema } from "@/lib/validation/customer";

describe("customerSchema", () => {
  it("menerima pelanggan dengan nama saja", () => {
    const result = customerSchema.safeParse({ name: "  Bu Sari  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Bu Sari");
      expect(result.data.phone).toBe("");
      expect(result.data.email).toBe("");
      expect(result.data.note).toBe("");
    }
  });

  it("menolak nama kosong", () => {
    const result = customerSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("menolak nama melebihi 100 karakter", () => {
    const result = customerSchema.safeParse({ name: "A".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("menormalisasi awalan 0 menjadi 62", () => {
    const result = customerSchema.safeParse({ name: "Andi", phone: "0812-3456-7890" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("6281234567890");
  });

  it("menormalisasi awalan +62 dan membuang spasi", () => {
    const result = customerSchema.safeParse({ name: "Andi", phone: " +62 812 3456 7890 " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("6281234567890");
  });

  it("mempertahankan awalan 62 yang sudah benar", () => {
    const result = customerSchema.safeParse({ name: "Andi", phone: "628123456789" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("628123456789");
  });

  it("menolak nomor telepon tidak valid", () => {
    const result = customerSchema.safeParse({ name: "Andi", phone: "12345" });
    expect(result.success).toBe(false);
  });

  it("menerima telepon kosong sebagai opsional", () => {
    const result = customerSchema.safeParse({ name: "Andi", phone: "" });
    expect(result.success).toBe(true);
  });

  it("menolak email tidak valid", () => {
    const result = customerSchema.safeParse({ name: "Andi", email: "bukan-email" });
    expect(result.success).toBe(false);
  });

  it("menerima email valid", () => {
    const result = customerSchema.safeParse({ name: "Andi", email: "andi@example.com" });
    expect(result.success).toBe(true);
  });

  it("menolak catatan melebihi 500 karakter", () => {
    const result = customerSchema.safeParse({ name: "Andi", note: "x".repeat(501) });
    expect(result.success).toBe(false);
  });
});
