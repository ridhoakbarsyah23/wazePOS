// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";

// Dipakai di CI (service Postgres) maupun lokal (Docker compose di port 5434).
const databaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://wazepos:wazepos@127.0.0.1:5434/wazepos";

const sql = postgres(databaseUrl, { max: 1, connect_timeout: 3, idle_timeout: 5 });

let dbReady = false;
try {
  await sql`select 1`;
  dbReady = true;
} catch {
  dbReady = false;
}

// ID tetap agar pembersihan antar-run idempoten.
const BUSINESS_A = "itest-business-a";
const BUSINESS_B = "itest-business-b";
const STAFF_USER_ID = "itest-user-staff";

beforeAll(async () => {
  if (!dbReady) return;
  await sql`DELETE FROM business WHERE id IN (${BUSINESS_A}, ${BUSINESS_B})`;
  await sql`DELETE FROM "user" WHERE id = ${STAFF_USER_ID}`;
  await sql`INSERT INTO business (id, name, type) VALUES (${BUSINESS_A}, ${"Bisnis Uji A"}, ${"f&b"}), (${BUSINESS_B}, ${"Bisnis Uji B"}, ${"f&b"})`;
});

afterAll(async () => {
  if (dbReady) {
    await sql`DELETE FROM business WHERE id IN (${BUSINESS_A}, ${BUSINESS_B})`;
    await sql`DELETE FROM "user" WHERE id = ${STAFF_USER_ID}`;
  }
  await sql.end({ timeout: 2 });
});

describe.runIf(dbReady)("kontrak migrasi (integration)", () => {
  it("memiliki kolom outlet.slug NOT NULL dengan indeks unik per bisnis", async () => {
    const columns = await sql`
      SELECT is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'outlet' AND column_name = 'slug'
    `;
    expect(columns).toHaveLength(1);
    expect(columns[0].is_nullable).toBe("NO");
    expect(columns[0].data_type).toBe("text");

    const indexes = await sql`
      SELECT indexdef FROM pg_indexes
      WHERE tablename = 'outlet' AND indexname = 'outlet_business_slug_idx'
    `;
    expect(indexes).toHaveLength(1);
    expect(indexes[0].indexdef).toContain("UNIQUE");
    expect(indexes[0].indexdef).toContain("(business_id, slug)");
  });

  it("menolak slug duplikat dalam satu bisnis tetapi mengizinkan di bisnis lain", async () => {
    await sql`INSERT INTO outlet (id, business_id, name, slug) VALUES ('itest-outlet-a1', ${BUSINESS_A}, ${"Gerai Utama"}, ${"gerai-utama"})`;

    await expect(
      sql`INSERT INTO outlet (id, business_id, name, slug) VALUES ('itest-outlet-a2', ${BUSINESS_A}, ${"Gerai Utama Dua"}, ${"gerai-utama"})`,
    ).rejects.toMatchObject({ code: "23505" });

    await sql`INSERT INTO outlet (id, business_id, name, slug) VALUES ('itest-outlet-b1', ${BUSINESS_B}, ${"Gerai Utama"}, ${"gerai-utama"})`;

    const rows = await sql`SELECT count(*)::int AS total FROM outlet WHERE slug = 'gerai-utama'`;
    expect(rows[0].total).toBe(2);
  });

  it("menyediakan audit log Platform Admin dengan indeks akses", async () => {
    const columns = await sql`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'platform_admin_audit_log'
      ORDER BY ordinal_position
    `;
    expect(columns.map((column) => column.column_name)).toEqual([
      "id",
      "business_id",
      "actor_user_id",
      "actor_email",
      "actor_name",
      "action",
      "entity_type",
      "entity_id",
      "metadata",
      "created_at",
    ]);
    expect(columns.find((column) => column.column_name === "actor_email")?.is_nullable).toBe("NO");

    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'platform_admin_audit_log'
        AND indexname NOT LIKE '%_pkey'
      ORDER BY indexname
    `;
    expect(indexes.map((index) => index.indexname)).toEqual([
      "platform_admin_audit_action_created_idx",
      "platform_admin_audit_actor_created_idx",
      "platform_admin_audit_business_created_idx",
    ]);
  });

  it("memulihkan akun credential staf agar menautkan user id (migrasi 0014)", async () => {
    await sql`INSERT INTO "user" (id, name, email) VALUES (${STAFF_USER_ID}, ${"Staf Uji"}, ${"itest-staff@example.com"})`;
    await sql`INSERT INTO business_member (id, business_id, user_id, role) VALUES ('itest-member-staff', ${BUSINESS_A}, ${STAFF_USER_ID}, 'cashier')`;
    await sql`INSERT INTO account (id, account_id, provider_id, user_id) VALUES ('itest-account-staff', 'itest-staff@example.com', 'credential', ${STAFF_USER_ID})`;

    // Pernyataan perbaikan yang sama dengan migrasi 0014.
    await sql`
      UPDATE "account" AS legacy_account
      SET "account_id" = legacy_account."user_id", "updated_at" = NOW()
      WHERE legacy_account."provider_id" = 'credential'
        AND legacy_account."account_id" <> legacy_account."user_id"
        AND EXISTS (
          SELECT 1 FROM "business_member"
          WHERE "business_member"."user_id" = legacy_account."user_id"
        )
        AND NOT EXISTS (
          SELECT 1 FROM "account" AS current_account
          WHERE current_account."provider_id" = 'credential'
            AND current_account."account_id" = legacy_account."user_id"
            AND current_account."id" <> legacy_account."id"
        )
    `;

    const repaired = await sql`SELECT account_id FROM account WHERE id = 'itest-account-staff'`;
    expect(repaired[0].account_id).toBe(STAFF_USER_ID);
  });
});
