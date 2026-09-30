"use client";

import dynamic from "next/dynamic";

export const PlatformAdminGrowthChart = dynamic(
  () => import("@/components/admin/platform-admin-growth-chart").then((m) => m.PlatformAdminGrowthChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] animate-pulse flex-col gap-4 rounded-3xl border border-[#dfe8e3] bg-white p-6" aria-hidden="true">
        <div className="h-5 w-48 rounded-lg bg-[#eef2f0]" />
        <div className="h-3 w-64 rounded-lg bg-[#eef2f0]" />
        <div className="mt-4 h-[300px] rounded-2xl bg-[#f4f8f6]" />
      </div>
    ),
  },
);
