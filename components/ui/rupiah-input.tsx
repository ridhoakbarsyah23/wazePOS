"use client";

type RupiahInputProps = {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  onEmpty?: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  className?: string;
  prefixLabel?: string;
};

function formatRupiah(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return value.toLocaleString("id-ID");
}

/**
 * Input angka dengan format ribuan rupiah otomatis (contoh: 25.000).
 * Fully controlled: angka murni (int) disimpan di state induk,
 * tampilan selalu diturunkan dari value sehingga tidak butuh efek sinkronisasi.
 */
export function RupiahInput({
  id,
  value,
  onChange,
  onEmpty,
  placeholder = "0",
  required,
  disabled,
  min = 0,
  max = 2_000_000_000,
  className,
  prefixLabel = "Rp",
}: RupiahInputProps) {
  const display = formatRupiah(value);

  function handleChange(rawValue: string) {
    const digits = rawValue.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    if (digits === "") {
      if (onEmpty) onEmpty();
      else onChange(0);
      return;
    }
    const numeric = Number(digits);
    onChange(Math.min(Math.max(numeric, min), max));
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#71857c]">
        {prefixLabel}
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={display}
        disabled={disabled}
        required={required}
        onChange={(e) => handleChange(e.target.value)}
        className={
          className ??
          "flex h-10 w-full rounded-xl border border-[#dbe5df] bg-white pl-10 pr-3 text-sm font-bold text-[#15211d] outline-none transition placeholder:font-normal placeholder:text-[#9fb0a7] focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 disabled:cursor-not-allowed disabled:opacity-50"
        }
      />
    </div>
  );
}
