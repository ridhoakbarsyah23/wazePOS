import { expect, test } from "@playwright/test";

test.describe("public production readiness", () => {
  test("serves liveness and full database readiness", async ({ request }) => {
    const liveResponse = await request.get("/api/live");
    expect(liveResponse.ok()).toBeTruthy();
    await expect(liveResponse.json()).resolves.toEqual({ ok: true });

    const healthResponse = await request.get("/api/health");
    expect(healthResponse.ok()).toBeTruthy();
    await expect(healthResponse.json()).resolves.toMatchObject({
      ok: true,
      database: {
        connected: true,
        authTables: true,
        businessTables: true,
        latestSchema: true,
      },
    });
  });

  test("landing page remains usable without horizontal overflow", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/wazePOS/i);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Tutup buku");
    await expect(page.locator('nav[aria-label="Navigasi utama"]')).toBeAttached();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("anonymous users cannot open protected workspaces", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("authentication accessibility", () => {
  test.use({ reducedMotion: "reduce" });

  test("login supports password managers and focuses its validation summary", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { level: 1, name: "Masuk ke wazePOS" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute("autocomplete", "email");
    await expect(page.locator('input[name="password"]')).toHaveAttribute("autocomplete", "current-password");

    await page.getByRole("button", { name: "Masuk" }).click();
    const alert = page.getByRole("alert").first();
    await expect(alert).toBeVisible();
    await expect(alert).toBeFocused();
    await expect(alert.getByRole("link", { name: /^Email:/ })).toBeVisible();
  });

  test("registration exposes semantic plan state and an accessible privacy dialog", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("heading", { level: 1, name: "Buat akun wazePOS" })).toBeVisible();
    await expect(page.locator('fieldset button[aria-pressed="true"]')).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Buat akun" })).toBeDisabled();

    await page.getByRole("button", { name: "Kebijakan Privasi" }).click();
    const dialog = page.getByRole("dialog", { name: "Kebijakan Privasi" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Tutup kebijakan privasi" })).toBeFocused();
    await dialog.getByRole("button", { name: "Tutup kebijakan privasi" }).click();
    await expect(dialog).toBeHidden();
  });
});
