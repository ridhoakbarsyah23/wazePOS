import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RupiahInput } from "@/components/ui/rupiah-input";

describe("RupiahInput", () => {
  it("menampilkan nilai dengan pemisah ribuan Indonesia", () => {
    render(<RupiahInput value={25_000} onChange={() => undefined} />);

    expect(screen.getByRole("textbox").getAttribute("value")).toBe("25.000");
    expect(screen.getByText("Rp")).toBeDefined();
  });

  it("mengirim angka murni dan membatasi nilai maksimum", () => {
    const onChange = vi.fn();
    render(<RupiahInput value={0} onChange={onChange} max={100_000} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Rp 125.000" } });

    expect(onChange).toHaveBeenCalledWith(100_000);
  });

  it("memanggil onEmpty saat isi dikosongkan", () => {
    const onChange = vi.fn();
    const onEmpty = vi.fn();
    render(<RupiahInput value={10_000} onChange={onChange} onEmpty={onEmpty} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });

    expect(onEmpty).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
  });
});
