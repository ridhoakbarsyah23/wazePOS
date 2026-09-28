"use client";

import { useEffect } from "react";

/**
 * Mendaftarkan service worker PWA setelah halaman termuat.
 * Hanya aktif di build produksi agar dev server Next tidak mengganggu cache.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // SW produksi yang tersisa dari sesi `npm start` di port yang sama akan
      // terus menyajikan aset/HTML dari cache dan memicu hydration mismatch
      // saat dev. Bersihkan otomatis agar dev selalu dimulai dari nol.
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => void registration.unregister());
      });
      if ("caches" in window) {
        void caches.keys().then((keys) => {
          keys.filter((key) => key.startsWith("wazepos-")).forEach((key) => void caches.delete(key));
        });
      }
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("Pendaftaran service worker gagal:", error);
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
