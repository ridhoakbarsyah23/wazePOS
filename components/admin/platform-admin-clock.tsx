"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock } from "lucide-react";

export function PlatformAdminClock() {
  const [now, setNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!mounted) {
    return null;
  }

  const todayFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(now);

  const timeFormatted = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(now);

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
}
