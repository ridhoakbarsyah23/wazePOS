"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  platformAdminThemeCookie,
  type PlatformAdminTheme,
} from "@/shared/admin/platform-admin-theme";

type PlatformAdminThemeContextValue = {
  theme: PlatformAdminTheme;
  setTheme: (theme: PlatformAdminTheme) => void;
};

const PlatformAdminThemeContext = createContext<PlatformAdminThemeContextValue | null>(null);

const themeToggleClassName =
  "grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-[#dbe5df] bg-white text-[#198760] transition-colors hover:border-[#9ac3b0] hover:bg-[#eef6f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#198760]/30 dark:border-[#303030] dark:bg-[#151515] dark:text-[#62d6a5] dark:hover:border-[#3f3f3f] dark:hover:bg-[#202020] dark:focus-visible:ring-[#62d6a5]/25 sm:size-9";

export function PlatformAdminThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: PlatformAdminTheme;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<PlatformAdminTheme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.adminTheme = theme;
    return () => {
      delete document.documentElement.dataset.adminTheme;
    };
  }, [theme]);

  const value = useMemo<PlatformAdminThemeContextValue>(() => ({
    theme,
    setTheme(nextTheme) {
      setThemeState(nextTheme);
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${platformAdminThemeCookie}=${nextTheme}; Path=/admin; Max-Age=31536000; SameSite=Lax${secure}`;
    },
  }), [theme]);

  return (
    <PlatformAdminThemeContext.Provider value={value}>
      <div data-admin-shell data-admin-theme={theme} className="min-h-dvh">
        {children}
      </div>
    </PlatformAdminThemeContext.Provider>
  );
}

export function PlatformAdminThemeToggle() {
  const context = useContext(PlatformAdminThemeContext);
  if (!context) return null;

  const isDark = context.theme === "dark";

  return (
    <button
      type="button"
      onClick={() => context.setTheme(isDark ? "light" : "dark")}
      aria-pressed={isDark}
      aria-label={isDark ? "Gunakan mode terang" : "Gunakan mode gelap"}
      title={isDark ? "Gunakan mode terang" : "Gunakan mode gelap"}
      data-theme-toggle="admin"
      data-active-theme={context.theme}
      className={themeToggleClassName}
    >
      {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
    </button>
  );
}
