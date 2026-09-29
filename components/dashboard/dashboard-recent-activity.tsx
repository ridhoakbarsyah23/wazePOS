"use client";

import { Receipt, TrendingUp, PackageMinus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Tipe data untuk aktivitas
export type ActivityItem = {
  id: string;
  type: "transaction" | "alert" | "insight";
  title: string;
  description: string;
  time: string;
  amount?: number;
};

const mockActivities: ActivityItem[] = [
  {
    id: "1",
    type: "transaction",
    title: "Transaksi #TRX-1029",
    description: "Kasir: Budi • Dine In",
    time: "Baru saja",
    amount: 125000,
  },
  {
    id: "2",
    type: "alert",
    title: "Peringatan Stok!",
    description: "Stok 'Kopi Susu Aren' tersisa 5 cup.",
    time: "10 menit yang lalu",
  },
  {
    id: "3",
    type: "insight",
    title: "Tren Penjualan Naik",
    description: "Penjualan jam ini meningkat 20% dari rata-rata.",
    time: "30 menit yang lalu",
  },
  {
    id: "4",
    type: "transaction",
    title: "Transaksi #TRX-1028",
    description: "Kasir: Siti • Takeaway",
    time: "45 menit yang lalu",
    amount: 85000,
  }
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardRecentActivity({ activities = mockActivities }: { activities?: ActivityItem[] }) {
  const displayActivities = activities && activities.length > 0 ? activities : mockActivities;

  return (
    <Card className="flex flex-col h-full border-[#dbe5df] bg-white shadow-sm dark:border-[#2d3a33] dark:bg-[#1a231f]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-[#141b18] dark:text-white flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          Aktivitas Terkini
        </CardTitle>
        <CardDescription className="text-xs text-[#627069] dark:text-[#a0b0a8]">
          Pantau transaksi dan notifikasi secara langsung
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-4">
          {displayActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 rounded-lg p-2 hover:bg-slate-50 transition-colors dark:hover:bg-[#25302a]">
              {/* Ikon berdasarkan tipe */}
              <div className={`mt-0.5 rounded-full p-2 shrink-0 ${activity.type === 'transaction' ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' :
                  activity.type === 'alert' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' :
                    'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                }`}>
                {activity.type === 'transaction' && <Receipt className="size-4" />}
                {activity.type === 'alert' && <PackageMinus className="size-4" />}
                {activity.type === 'insight' && <TrendingUp className="size-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#141b18] dark:text-white truncate">
                    {activity.title}
                  </p>
                  {activity.amount && (
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {formatMoney(activity.amount)}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-[#627069] dark:text-[#a0b0a8] truncate">
                    {activity.description}
                  </p>
                  <p className="text-[10px] text-slate-400 shrink-0 ml-2">
                    {activity.time}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
