"use client";

import { memo, useEffect, useState } from "react";
import { Calendar, Clock } from "lucide-react";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

export const DashboardClock = memo(function DashboardClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Detik tidak kritis untuk kas; interval 30 detik cukup + hemat render.
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const todayFormatted = dateFormatter.format(now);
  const timeFormatted = timeFormatter.format(now);

  return (
    <>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dbe5df] bg-[#f8faf9] px-3 py-1 text-xs font-semibold text-[#627069]">
        <Calendar className="size-3.5 text-[#8b9991]" aria-hidden="true" />
        <span suppressHydrationWarning>{todayFormatted}</span>
      </span>
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-[#cce4d7] bg-[#eef6f1] px-3 py-1 text-xs font-bold text-[#14532d]"
        title="Jam operasional (WIB)"
      >
        <Clock className="size-3.5 text-[#198760]" aria-hidden="true" />
        <span className="tabular-nums" suppressHydrationWarning>
          {timeFormatted}
        </span>
        <span className="font-semibold text-[#198760]">WIB</span>
      </span>
    </>
  );
});
