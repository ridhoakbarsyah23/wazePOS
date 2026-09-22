import { describe, expect, it } from "vitest";
import { createUniqueOutletSlug, slugifyOutletName } from "@/lib/outlet-slug";

describe("slug URL gerai", () => {
  it("mengubah nama gerai menjadi slug yang mudah dibaca", () => {
    expect(slugifyOutletName("Gerai Utama Jakarta")).toBe("gerai-utama-jakarta");
    expect(slugifyOutletName("Kafe Élite & Resto")).toBe("kafe-elite-resto");
  });

  it("menyediakan slug cadangan untuk nama tanpa karakter alfanumerik", () => {
    expect(slugifyOutletName("--- !!! ---")).toBe("gerai");
  });

  it("menambahkan nomor ketika slug sudah dipakai dalam bisnis yang sama", () => {
    expect(createUniqueOutletSlug("Cabang Bandung", ["cabang-bandung"])).toBe(
      "cabang-bandung-2",
    );
    expect(
      createUniqueOutletSlug("Cabang Bandung", [
        "cabang-bandung",
        "cabang-bandung-2",
        "cabang-bandung-3",
      ]),
    ).toBe("cabang-bandung-4");
  });
});
