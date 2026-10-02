"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function PlatformAdminSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/admin/businesses?query=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative hidden w-48 sm:block lg:w-64">
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#9aa69f]" aria-hidden="true" />
      <input
        type="search"
        placeholder="Cari usaha atau email..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-9 w-full min-w-0 cursor-text rounded-xl border border-[#dfe8e3] bg-[#f8faf9] pl-9 pr-3 text-xs text-[#15211d] outline-none transition duration-200 placeholder:text-[#9aa69f] hover:border-[#b5cec1] focus:border-[#198760] focus:bg-white focus:ring-4 focus:ring-[#198760]/10 motion-reduce:transition-none"
      />
    </form>
  );
}
