import { Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export type ActivityItem = {
  id: string;
  type: "transaction";
  title: string;
  description: string;
  time: string;
  amount?: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardRecentActivity({ activities }: { activities: ActivityItem[] }) {
  return (
    <Card className="flex h-full flex-col border-[#dbe5df] bg-white shadow-sm dark:border-[#2d3a33] dark:bg-[#1a231f]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-[#141b18] dark:text-white">
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          Aktivitas Terkini
        </CardTitle>
        <CardDescription className="text-xs text-[#627069] dark:text-[#a0b0a8]">
          Transaksi terbaru berdasarkan periode dan gerai
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto pr-2">
        {activities.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-[#dbe5df] px-5 text-center dark:border-[#34443b]">
            <Receipt className="mb-3 size-8 text-[#9aaba2]" aria-hidden="true" />
            <p className="text-sm font-semibold text-[#3f4d46] dark:text-[#d4ded8]">
              Belum ada aktivitas transaksi
            </p>
            <p className="mt-1 text-xs text-[#7b8982] dark:text-[#94a39b]">
              Transaksi baru akan tampil di sini setelah pembayaran selesai.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-[#25302a]"
              >
                <div className="mt-0.5 shrink-0 rounded-full bg-sky-50 p-2 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                  <Receipt className="size-4" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-[#141b18] dark:text-white">
                      {activity.title}
                    </p>
                    {activity.amount !== undefined && (
                      <p className="shrink-0 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(activity.amount)}
                      </p>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between">
                    <p className="truncate text-xs text-[#627069] dark:text-[#a0b0a8]">
                      {activity.description}
                    </p>
                    <p className="ml-2 shrink-0 text-[10px] text-slate-400">
                      {activity.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
