"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-xl bg-[#198760] px-4 py-2 text-sm font-bold text-white">
      Cetak struk
    </button>
  );
}
