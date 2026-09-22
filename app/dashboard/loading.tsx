export default function DashboardLoading() {
  return (
    <main className="min-h-dvh bg-[#f4faf7] p-4 sm:p-8">
      <div className="mx-auto w-full max-w-[1240px] animate-pulse space-y-6">
        <div className="h-52 rounded-3xl bg-white sm:h-44" />
        <div className="h-16 rounded-2xl bg-white" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 rounded-3xl bg-white" />)}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-72 rounded-3xl bg-white" />)}
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
          <div className="h-96 rounded-3xl bg-white" />
          <div className="h-96 rounded-3xl bg-white" />
        </div>
      </div>
    </main>
  );
}
