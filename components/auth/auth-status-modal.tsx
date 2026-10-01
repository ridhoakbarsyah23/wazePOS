"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { CheckCircle2, Loader2 } from "lucide-react";

export type AuthStatus = "idle" | "checking" | "success";

export function AuthStatusModal({ status, message = "Memeriksa akun..." }: { status: AuthStatus, message?: string }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "idle") return;

    // Animasi masuk (Pop in) dengan glassmorphism
    gsap.fromTo(
      overlayRef.current,
      { opacity: 0, backdropFilter: "blur(0px)" },
      { opacity: 1, backdropFilter: "blur(8px)", duration: 0.4, ease: "power2.out" }
    );
    
    gsap.fromTo(
      modalRef.current,
      { scale: 0.8, opacity: 0, y: 30 },
      { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.2)" }
    );
  }, [status]);

  useEffect(() => {
    if (status === "success") {
      // Animasi pergantian icon dari loading ke success
      gsap.fromTo(
        iconRef.current,
        { scale: 0, opacity: 0, rotate: -180 },
        { scale: 1, opacity: 1, rotate: 0, duration: 0.7, ease: "elastic.out(1, 0.5)" }
      );
    }
  }, [status]);

  if (status === "idle") return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#f0faf5]/40"
      aria-live="assertive"
    >
      <div
        ref={modalRef}
        className="flex w-full max-w-sm flex-col items-center gap-5 rounded-[2rem] border border-white/60 bg-white/80 px-8 py-10 text-center shadow-[0_20px_40px_-15px_rgba(25,135,96,0.2)] backdrop-blur-xl"
      >
        <div 
          ref={iconRef} 
          className="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#1ba36f] to-[#147554] text-white shadow-[0_10px_20px_rgba(25,135,96,0.3)] ring-4 ring-[#198760]/10"
        >
          {status === "checking" ? (
            <Loader2 className="size-10 animate-spin" strokeWidth={2.5} />
          ) : (
            <CheckCircle2 className="size-10" strokeWidth={2.5} />
          )}
        </div>
        <div className="grid gap-2">
          <h3 className="text-xl font-extrabold tracking-tight text-[#106348]">
            {status === "checking" ? message : "Berhasil Masuk!"}
          </h3>
          <p className="text-sm font-semibold text-[#5e6d65]">
            {status === "checking" ? "Mohon tunggu sebentar..." : "Mengarahkan ke halaman..."}
          </p>
        </div>
      </div>
    </div>
  );
}
