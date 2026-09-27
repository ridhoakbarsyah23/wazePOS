// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isMissingSchemaError } from "@/server/db/schema-errors";

describe("isMissingSchemaError", () => {
  it("mengenali kode undefined_table Postgres", () => {
    expect(isMissingSchemaError({ code: "42P01", message: "boom" })).toBe(true);
  });

  it("mengenali kode undefined_column Postgres", () => {
    expect(isMissingSchemaError({ code: "42703", message: "boom" })).toBe(true);
  });

  it("mengenali pesan relasi cash_expense yang belum ada", () => {
    expect(
      isMissingSchemaError({
        message: 'relation "public.cash_expense" does not exist',
      }),
    ).toBe(true);
  });

  it("mengenali error bersarang dari driver postgres", () => {
    expect(
      isMissingSchemaError({
        message: "query failed",
        cause: { message: 'relation "cash_expense" does not exist' },
      }),
    ).toBe(true);
  });

  it("tidak menganggap error koneksi sebagai skema hilang", () => {
    expect(isMissingSchemaError({ code: "ECONNREFUSED", message: "connect refused" })).toBe(false);
    expect(isMissingSchemaError(null)).toBe(false);
  });
});
