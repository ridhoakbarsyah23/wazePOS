export default function CustomersLoading() {
  return (
    <main className="min-h-dvh bg-[#f4faf7] p-4 sm:p-8">
      <div className="mx-auto w-full max-w-[1180px] animate-pulse space-y-6">
        <div className="h-40 rounded-3xl bg-white sm:h-36" />
        <div className="flex items-center justify-between gap-3">
          <div className="h-10 w-full max-w-xs rounded-xl bg-white" />
          <div className="h-10 w-40 rounded-xl bg-white" />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-36 rounded-2xl bg-white" />
          ))}
        </div>
      </div>
    </main>
  );
}
