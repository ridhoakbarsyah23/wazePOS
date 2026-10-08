import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformAdminSearch } from "@/components/admin/platform-admin-search";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

describe("PlatformAdminSearch", () => {
  beforeEach(() => {
    mocks.push.mockClear();
  });

  it("mengirim pencarian header ke filter daftar usaha", () => {
    render(<PlatformAdminSearch />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "  Kedai Senja  " } });
    fireEvent.submit(screen.getByRole("search"));

    expect(mocks.push).toHaveBeenCalledWith("/admin/businesses?q=Kedai%20Senja");
    expect(screen.getByRole("searchbox").className).toContain("dark:bg-[#151515]");
  });

  it("tidak berpindah halaman untuk pencarian kosong", () => {
    render(<PlatformAdminSearch />);

    fireEvent.submit(screen.getByRole("search"));

    expect(mocks.push).not.toHaveBeenCalled();
  });
});
