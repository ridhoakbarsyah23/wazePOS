import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  PlatformAdminThemeProvider,
  PlatformAdminThemeToggle,
} from "@/components/admin/platform-admin-theme";

describe("PlatformAdminTheme", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.adminTheme;
  });

  afterEach(() => {
    delete document.documentElement.dataset.adminTheme;
  });

  it("merender tema awal dari server tanpa mengubah dashboard theme", async () => {
    render(
      <PlatformAdminThemeProvider initialTheme="dark">
        <PlatformAdminThemeToggle />
      </PlatformAdminThemeProvider>,
    );

    expect(document.querySelector("[data-admin-shell]")?.getAttribute("data-admin-theme")).toBe("dark");
    await waitFor(() => expect(document.documentElement.dataset.adminTheme).toBe("dark"));
    expect(document.documentElement.dataset.dashboardTheme).toBeUndefined();
    expect(screen.getByRole("button", { name: "Gunakan mode terang" })).toBeDefined();
  });

  it("mengganti tema admin dan menyimpan preferensinya", async () => {
    render(
      <PlatformAdminThemeProvider initialTheme="light">
        <PlatformAdminThemeToggle />
      </PlatformAdminThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Gunakan mode gelap" }));

    await waitFor(() => {
      expect(document.querySelector("[data-admin-shell]")?.getAttribute("data-admin-theme")).toBe("dark");
    });
    expect(screen.getByRole("button", { name: "Gunakan mode terang" })).toBeDefined();
  });
});
