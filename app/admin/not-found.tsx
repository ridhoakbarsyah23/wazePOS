import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlatformAdminNotFound() {
  return (
    <div className="grid place-items-center px-2 py-10 sm:py-14">
      <div className="w-full max-w-md rounded-3xl border border-[#dfe8e3] bg-white p-8 text-center shadow-[0_20px_60px_rgba(16,65,48,.1)]">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-700"><ShieldX className="size-7" /></span>
        <h1 className="mt-5 text-xl font-black">Halaman tidak tersedia</h1>
        <p className="mt-2 text-sm leading-6 text-[#627069]">Akun ini tidak memiliki akses ke area internal wazePOS.</p>
        <Button asChild className="mt-6"><Link href="/dashboard">Kembali ke dashboard</Link></Button>
      </div>
    </div>
  );
}
