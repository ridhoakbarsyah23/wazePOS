"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const themeStorageKey = "wazepos:dashboard-theme";
const themeChangeEvent = "wazepos:dashboard-theme-change";

type DashboardTheme = "light" | "dark";

const themeToggleClassName =
  "grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-[#dbe5df] bg-white text-[#198760] transition-colors hover:border-[#9ac3b0] hover:bg-[#eef6f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#198760]/30 dark:border-[#303030] dark:bg-[#151515] dark:text-[#62d6a5] dark:hover:border-[#3f3f3f] dark:hover:bg-[#202020] dark:focus-visible:ring-[#62d6a5]/25";

function applyTheme(theme: DashboardTheme) {
  if (theme === "dark") {
    document.documentElement.dataset.dashboardTheme = "dark";
  } else {
    delete document.documentElement.dataset.dashboardTheme;
  }
}

export function DashboardThemeToggle({
  enabled,
  asMenuItem = false,
}: {
  enabled: boolean;
  asMenuItem?: boolean;
}) {
  const [theme, setTheme] = useState<DashboardTheme>("light");

  useEffect(() => {
    if (!enabled) {
      applyTheme("light");
      return;
    }

    const storedTheme = localStorage.getItem(themeStorageKey) === "dark" ? "dark" : "light";
    applyTheme(storedTheme);
    const frame = window.requestAnimationFrame(() => setTheme(storedTheme));

    function syncTheme(event: Event) {
      window.cancelAnimationFrame(frame);
      const nextTheme = (event as CustomEvent<DashboardTheme>).detail;
      setTheme(nextTheme);
      applyTheme(nextTheme);
    }

    window.addEventListener(themeChangeEvent, syncTheme);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(themeChangeEvent, syncTheme);
    };
  }, [enabled]);

  if (!enabled) return null;

  const isDark = theme === "dark";

  function toggleTheme() {
    const nextTheme: DashboardTheme = isDark ? "light" : "dark";
    localStorage.setItem(themeStorageKey, nextTheme);
    window.dispatchEvent(new CustomEvent<DashboardTheme>(themeChangeEvent, { detail: nextTheme }));
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role={asMenuItem ? "menuitemcheckbox" : undefined}
      aria-checked={asMenuItem ? isDark : undefined}
      aria-pressed={asMenuItem ? undefined : isDark}
      aria-label={isDark ? "Gunakan mode terang" : "Gunakan mode gelap"}
      title={isDark ? "Gunakan mode terang" : "Gunakan mode gelap (wazePOS Bisnis)"}
      data-theme-toggle="dashboard"
      data-active-theme={theme}
      className={themeToggleClassName}
    >
      {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
    </button>
  );
}
