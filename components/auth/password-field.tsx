"use client";

import { useState } from "react";

type PasswordFieldProps = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  autoComplete: "current-password" | "new-password";
  disabled: boolean;
  error?: string;
  value?: string;
  onInput?: () => void;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export const authInputClass = "h-12 w-full min-w-0 rounded-xl border border-[#d8e3dd] bg-white px-3.5 text-base font-medium text-[#15211d] outline-none transition duration-200 placeholder:font-normal placeholder:text-[#9aa69f] hover:border-[#b5cec1] focus:border-[#198760] focus:ring-4 focus:ring-[#198760]/10 disabled:cursor-not-allowed disabled:bg-[#f5f8f6] disabled:opacity-60 sm:text-sm motion-reduce:transition-none";

function VisibilityIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
      <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 5 9 5a15.5 15.5 0 0 1-2.1 2.6M6.6 6.6C4.4 8 3 10 3 10s3.5 5 9 5a9.7 9.7 0 0 0 3.4-.6" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function PasswordField({ id, name, label, placeholder, autoComplete, disabled, error, value, onInput, onChange }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const errorId = `${id}-error`;
  const capsId = `${id}-caps-lock`;

  return (
    <div className="grid min-w-0 gap-2 text-xs font-bold text-[#34443d]">
      <label htmlFor={id}>{label}</label>
      <div className="relative min-w-0">
        <input
          id={id}
          className={`${authInputClass} pr-12 ${error ? "!border-red-400 !ring-4 !ring-red-100" : ""}`}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={[error ? errorId : "", capsLockActive ? capsId : ""].filter(Boolean).join(" ") || undefined}
          onInput={onInput}
          onChange={onChange}
          onKeyUp={(event) => setCapsLockActive(event.getModifierState("CapsLock"))}
          onBlur={() => setCapsLockActive(false)}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-[#65736c] transition duration-200 hover:bg-[#eaf7f0] hover:text-[#147554] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#198760]/30 disabled:opacity-50 motion-reduce:transition-none"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Sembunyikan ${label.toLowerCase()}` : `Tampilkan ${label.toLowerCase()}`}
          aria-pressed={visible}
          disabled={disabled}
        >
          <VisibilityIcon visible={visible} />
        </button>
      </div>
      {error && <span id={errorId} className="font-semibold text-red-600">{error}</span>}
      {capsLockActive && <span id={capsId} className="font-semibold text-amber-700">Caps Lock sedang aktif.</span>}
    </div>
  );
}
