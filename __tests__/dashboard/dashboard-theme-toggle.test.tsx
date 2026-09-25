import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { DashboardThemeToggle } from "@/components/dashboard/dashboard-theme-toggle";

describe("DashboardThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.dashboardTheme;
  });

  it("tidak menyediakan atau menerapkan mode gelap ketika paket tidak mendukungnya", async () => {
    localStorage.setItem("wazepos:dashboard-theme", "dark");
    document.documentElement.dataset.dashboardTheme = "dark";

    render(<DashboardThemeToggle enabled={false} />);

    await waitFor(() => {
      expect(document.documentElement.dataset.dashboardTheme).toBeUndefined();
    });
    expect(screen.queryByRole("button", { name: /mode gelap/i })).toBeNull();
  });

  it("menyimpan dan menerapkan pilihan tema untuk paket yang mendukungnya", async () => {
    render(<DashboardThemeToggle enabled />);

    const toggle = screen.getByRole("button", { name: "Gunakan mode gelap" });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(document.documentElement.dataset.dashboardTheme).toBe("dark");
    });
    expect(localStorage.getItem("wazepos:dashboard-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Gunakan mode terang" })).toBeDefined();
  });
});
