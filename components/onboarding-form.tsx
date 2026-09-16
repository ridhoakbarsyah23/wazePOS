"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { businessTypes, onboardingSchema } from "@/lib/validation/onboarding";
import { plans, type PlanId } from "@/lib/plans";

export function OnboardingForm({ selectedPlan }: { selectedPlan: PlanId }) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const result = onboardingSchema.safeParse({
      businessName: formData.get("businessName"),
      businessType: formData.get("businessType"),
      outletName: formData.get("outletName"),
      address: formData.get("address") || undefined,
      plan: selectedPlan,
    });

    if (!result.success) {
      setErrorMessage(result.error.issues[0]?.message ?? "Periksa kembali data usaha Anda.");
      return;
    }

    setIsPending(true);
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.data),
    });
    const payload = (await response.json()) as { message?: string };

    if (!response.ok) {
      setErrorMessage(payload.message ?? "Profil usaha belum berhasil disimpan.");
      setIsPending(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 grid gap-5" noValidate>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-[#cfe3d9] bg-[#f1fbf6] px-4 py-3 text-sm">
        <span className="text-[#627069]">Uji coba paket</span>
        <strong className="text-[#106348]">{plans[selectedPlan].name}</strong>
      </div>
      <label className="grid gap-2 text-sm font-bold text-[#34443d]">Nama usaha<input className="h-12 rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-4 outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10" name="businessName" required maxLength={100} placeholder="Contoh: Toko Maju Bersama" disabled={isPending} /></label>
      <label className="grid gap-2 text-sm font-bold text-[#34443d]">Jenis usaha<select className="h-12 rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-4 outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10" name="businessType" required defaultValue="" disabled={isPending}><option value="" disabled>Pilih jenis usaha</option>{businessTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold text-[#34443d]">Nama gerai pertama<input className="h-12 rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-4 outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10" name="outletName" required maxLength={100} placeholder="Contoh: Gerai Utama" disabled={isPending} /></label>
      <label className="grid gap-2 text-sm font-bold text-[#34443d]">Alamat <span className="font-normal text-[#7b8982]">(opsional)</span><textarea className="min-h-24 resize-y rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-4 py-3 outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10" name="address" maxLength={300} placeholder="Alamat gerai" disabled={isPending} /></label>
      {errorMessage && <p className="m-0 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{errorMessage}</p>}
      <button className="button button-primary button-large full-width" type="submit" disabled={isPending}>{isPending ? "Menyiapkan usaha..." : "Simpan dan buka dashboard"}</button>
    </form>
  );
}
