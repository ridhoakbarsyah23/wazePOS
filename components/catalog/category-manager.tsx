"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Edit2,
  FolderPlus,
  Loader2,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CategoryItem = {
  id: string;
  name: string;
  productCount: number;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

type CategoryManagerProps = {
  initialCategories: CategoryItem[];
  onChange?: (categories: CategoryItem[]) => void;
  compact?: boolean;
};

function sortCategories(categories: CategoryItem[]) {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name, "id-ID"));
}

async function readApiPayload(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload.message === "string" ? payload.message : "Permintaan kategori gagal diproses.",
    );
  }
  return payload as { message?: string; category?: CategoryItem };
}

export function CategoryManager({
  initialCategories,
  onChange,
  compact = false,
}: CategoryManagerProps) {
  const router = useRouter();
  const nameInputId = useId();
  const searchInputId = useId();
  const [categories, setCategories] = useState(initialCategories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    if (!query) return categories;
    return categories.filter((item) => item.name.toLocaleLowerCase("id-ID").includes(query));
  }, [categories, search]);

  const categorizedProducts = categories.reduce(
    (total, item) => total + Number(item.productCount ?? 0),
    0,
  );

  function updateCategories(nextCategories: CategoryItem[]) {
    const sorted = sortCategories(nextCategories);
    setCategories(sorted);
    onChange?.(sorted);
  }

  function notify(type: Notice["type"], message: string) {
    setNotice({ type, message });
    window.setTimeout(() => {
      setNotice((current) => (current?.message === message ? null : current));
    }, 5000);
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    setPendingAction("create");
    setNotice(null);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await readApiPayload(response);
      if (!payload.category) throw new Error("Respons kategori tidak lengkap.");

      updateCategories([...categories, { ...payload.category, productCount: 0 }]);
      setNewCategoryName("");
      notify("success", payload.message ?? `Kategori "${name}" berhasil dibuat.`);
      router.refresh();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal membuat kategori.");
    } finally {
      setPendingAction(null);
    }
  }

  function startEditing(item: CategoryItem) {
    setEditingId(item.id);
    setEditingName(item.name);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName("");
  }

  async function handleSave(item: CategoryItem) {
    const name = editingName.trim();
    if (!name) return;

    setPendingAction(`edit:${item.id}`);
    setNotice(null);
    try {
      const response = await fetch(`/api/categories/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await readApiPayload(response);
      if (!payload.category) throw new Error("Respons kategori tidak lengkap.");

      updateCategories(
        categories.map((current) =>
          current.id === item.id
            ? { ...current, name: payload.category?.name ?? name }
            : current,
        ),
      );
      cancelEditing();
      notify("success", payload.message ?? "Kategori berhasil diperbarui.");
      router.refresh();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal memperbarui kategori.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDelete(item: CategoryItem) {
    setPendingAction(`delete:${item.id}`);
    setNotice(null);
    try {
      const response = await fetch(`/api/categories/${item.id}`, { method: "DELETE" });
      const payload = await readApiPayload(response);
      updateCategories(categories.filter((current) => current.id !== item.id));
      if (editingId === item.id) cancelEditing();
      notify("success", payload.message ?? `Kategori "${item.name}" berhasil dihapus.`);
      router.refresh();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal menghapus kategori.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section
      className={
        compact
          ? "w-full"
          : "rounded-3xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_24px_rgba(16,65,48,.06)] sm:p-6"
      }
    >
      {!compact && (
        <div className="flex flex-col gap-4 border-b border-[#edf2ee] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-[#198760]">
              <Tag className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tight text-[#15211d]">Kelola Kategori</h2>
              <p className="mt-1 text-xs leading-5 text-[#627069]">
                Buat, ubah, dan hapus kategori produk dari satu tempat.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <div className="rounded-xl border border-[#e5ede8] bg-[#fbfdfc] px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9991]">Kategori</p>
              <p className="mt-0.5 text-sm font-black text-[#15211d]">{categories.length}</p>
            </div>
            <div className="rounded-xl border border-[#e5ede8] bg-[#fbfdfc] px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a9991]">Produk terkategorikan</p>
              <p className="mt-0.5 text-sm font-black text-[#15211d]">{categorizedProducts}</p>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div
          className={`mt-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-bold ${
            notice.type === "success"
              ? "border-[#cae8d9] bg-[#eaf7f0] text-[#198760]"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex min-w-0 items-center gap-2">
            {notice.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            <span className="min-w-0">{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="shrink-0 rounded-lg p-1 text-current/70 hover:bg-black/5"
            aria-label="Tutup notifikasi"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className={compact ? "mt-0" : "mt-6"}>
        <div className="grid gap-5 lg:grid-cols-[minmax(250px,0.7fr)_minmax(0,1.3fr)]">
          <form
            onSubmit={handleCreate}
            className="h-fit rounded-2xl border border-[#dfe8e3] bg-[#fafcfb] p-4 sm:p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                <FolderPlus className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-[#15211d]">Tambah kategori</h3>
                <p className="text-[11px] text-[#627069]">Maksimal 80 karakter.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={nameInputId} className="text-xs font-bold text-[#627069]">
                Nama kategori
              </Label>
              <Input
                id={nameInputId}
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="Contoh: Minuman"
                maxLength={80}
                autoComplete="off"
                className="h-10 rounded-xl border-[#dbe5df] bg-white text-xs"
              />
            </div>
            <Button
              type="submit"
              disabled={pendingAction !== null || !newCategoryName.trim()}
              className="mt-4 h-10 w-full rounded-xl bg-[#198760] text-xs font-bold text-white hover:bg-[#147554]"
            >
              {pendingAction === "create" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FolderPlus className="size-4" />
              )}
              <span>Simpan kategori</span>
            </Button>
          </form>

          <div className="min-w-0">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#627069]">
                  Daftar kategori ({categories.length})
                </h3>
                <p className="mt-1 text-[11px] text-[#627069]">
                  Produk yang dihapus dari kategori akan menjadi tanpa kategori.
                </p>
              </div>
              <div className="relative w-full sm:w-56">
                <Label htmlFor={searchInputId} className="sr-only">
                  Cari kategori
                </Label>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a9991]" />
                <Input
                  id={searchInputId}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari kategori..."
                  className="h-9 pl-9 text-xs"
                />
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {filteredCategories.map((item) => {
                const isEditing = editingId === item.id;
                const isDeleting = pendingAction === `delete:${item.id}`;
                const isSaving = pendingAction === `edit:${item.id}`;

                return (
                  <div
                    key={item.id}
                    className="flex min-h-[4.5rem] items-center justify-between gap-2 rounded-2xl border border-[#e5ede8] bg-[#fbfdfc] p-3.5 transition hover:border-[#b8d6c7] hover:shadow-xs"
                  >
                    {isEditing ? (
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <Input
                          autoFocus
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") void handleSave(item);
                            if (event.key === "Escape") cancelEditing();
                          }}
                          maxLength={80}
                          className="h-9 min-w-0 text-xs"
                          aria-label={`Ubah nama kategori ${item.name}`}
                        />
                        <button
                          type="button"
                          onClick={() => void handleSave(item)}
                          disabled={isSaving || !editingName.trim()}
                          className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                          title="Simpan perubahan"
                          aria-label="Simpan perubahan"
                        >
                          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
                          title="Batal"
                          aria-label="Batal ubah kategori"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-emerald-50 text-[#198760]">
                            <Tag className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <strong className="block truncate text-xs font-bold text-[#15211d]">
                              {item.name}
                            </strong>
                            <span className="text-[10px] text-[#627069]">
                              {Number(item.productCount ?? 0)} produk terkait
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditing(item)}
                            disabled={pendingAction !== null}
                            className="grid size-8 place-items-center rounded-lg border border-[#dbe5df] bg-white text-[#627069] transition hover:border-[#198760] hover:text-[#198760] disabled:opacity-50"
                            title="Ubah nama kategori"
                            aria-label={`Ubah nama kategori ${item.name}`}
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <ConfirmationDialog
                            title={`Hapus kategori "${item.name}"?`}
                            description="Produk dalam kategori ini akan menjadi tanpa kategori. Riwayat produk tetap aman."
                            confirmLabel="Hapus kategori"
                            disabled={pendingAction !== null}
                            onConfirm={() => void handleDelete(item)}
                            trigger={
                              <button
                                type="button"
                                disabled={isDeleting || pendingAction !== null}
                                className="grid size-8 place-items-center rounded-lg border border-[#fed7d7] bg-white text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                                title="Hapus kategori"
                                aria-label={`Hapus kategori ${item.name}`}
                              >
                                {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                              </button>
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {filteredCategories.length === 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-[#dfe8e3] p-8 text-center">
                  <Tag className="mx-auto size-7 text-[#a4b2aa]" />
                  <p className="mt-3 text-sm font-bold text-[#455850]">
                    {search ? "Kategori tidak ditemukan" : "Belum ada kategori"}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#627069]">
                    {search
                      ? "Coba kata kunci lain atau hapus pencarian."
                      : "Tambahkan kategori pertama untuk mengelompokkan produk dengan lebih rapi."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
