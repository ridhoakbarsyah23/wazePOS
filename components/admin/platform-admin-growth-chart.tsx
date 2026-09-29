"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, Users } from "lucide-react";

export type GrowthDataPoint = {
  date: string;
  pendaftar: number;
};

export function PlatformAdminGrowthChart({ data }: { data: GrowthDataPoint[] }) {
  const [days, setDays] = useState<number>(30);

  const displayData = useMemo(() => {
    return data.slice(-days);
  }, [data, days]);

  const total = useMemo(() => displayData.reduce((acc, curr) => acc + curr.pendaftar, 0), [displayData]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-[#dfe8e3] bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#15211d]">
            <Users className="size-5 text-[#198760]" />
            Tren Pertumbuhan Pelanggan
          </h2>
          <p className="mt-1 text-sm text-[#627069]">Pendaftaran toko baru dalam {days} hari terakhir</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {[1, 7, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  days === d
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                {d} Hari
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-emerald-700">
            <TrendingUp className="size-4" />
            <span className="text-sm font-bold">+{total} Pengguna Baru</span>
          </div>
        </div>
      </div>

      <div className="h-[300px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPendaftar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#198760" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#198760" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: "#64748b" }} 
              dy={10}
              minTickGap={20}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: "#64748b" }} 
              dx={-10}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl border border-slate-100 bg-white/80 p-3 shadow-xl backdrop-blur-md">
                      <p className="mb-1 text-xs font-semibold text-slate-500">{label}</p>
                      <p className="text-lg font-black text-[#15211d]">
                        {payload[0].value} <span className="text-sm font-bold text-[#627069]">Toko</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="pendaftar"
              stroke="#198760"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorPendaftar)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
