"use client";

import { memo, useEffect, useState } from "react";
import { Calendar, Clock } from "lucide-react";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

export const PlatformAdminClock = memo(function PlatformAdminClock() {
  const [now, setNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), 0);
    // Detik tidak kritis; 30 detik cukup + hemat render hero admin.
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(id);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  const todayFormatted = dateFormatter.format(now);
  const timeFormatted = timeFormatter.format(now);

  return (
    <>
      <span className="admin-ops-glass inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-emerald-100">
        <Calendar className="size-3.5 text-emerald-300" aria-hidden="true" />
        <span suppressHydrationWarning>{todayFormatted}</span>
      </span>
      <span className="admin-ops-glass inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-emerald-100">
        <Clock className="size-3.5 text-emerald-300" aria-hidden="true" />
        <span className="tabular-nums font-mono tracking-wider" suppressHydrationWarning>
          {timeFormatted}
        </span>
        <span className="font-extrabold text-emerald-300">WIB</span>
      </span>
    </>
  );
});
