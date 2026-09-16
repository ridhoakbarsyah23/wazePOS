export default function DashboardLoading() {
  return (
    <main className="min-h-dvh bg-[#f4faf7] p-4 sm:p-8">
      <div className="mx-auto w-full max-w-[1180px] animate-pulse space-y-6">
        <div className="h-16 rounded-2xl bg-white" />
        <div className="h-32 rounded-2xl bg-white" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 rounded-2xl bg-white" />)}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.5fr]">
          <div className="h-96 rounded-2xl bg-white" />
          <div className="h-96 rounded-2xl bg-white" />
        </div>
      </div>
    </main>
  );
}
