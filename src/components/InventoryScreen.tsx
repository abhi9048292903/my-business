"use client";

import { useEffect, useState } from "react";
import { HeaderActions, HeaderButton, HeaderLink, IconClose, IconFilter, IconPlus, IconScan } from "@/components/HeaderActions";
import { api, type CatalogItem, type Category } from "@/lib/client/types";
import { formatINR } from "@/lib/money";

const UNITS = ["pcs", "kg", "g", "L", "ml", "pack", "dozen"];
const GST = [0, 5, 12, 18, 28];

type Draft = {
  id?: string;
  name: string;
  barcode: string;
  categoryId: string;
  unit: string;
  priceRupees: string;
  gstRate: number;
  stockQty: string;
  lowStockQty: string;
};

const blank = (): Draft => ({
  name: "",
  barcode: "",
  categoryId: "",
  unit: "pcs",
  priceRupees: "",
  gstRate: 0,
  stockQty: "0",
  lowStockQty: "5",
});

export function InventoryScreen() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const data = await api<{ items: CatalogItem[]; categories: Category[] }>("/api/items");
    setItems(data.items);
    setCategories(data.categories);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load stock"));
  }, []);

  const visible = items.filter((item) => {
    const text = `${item.name} ${item.barcode || ""}`.toLowerCase().includes(query.trim().toLowerCase());
    const low = !lowOnly || item.stock_qty <= item.low_stock_qty;
    return text && low;
  });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const body = {
      name: draft.name,
      barcode: draft.barcode,
      categoryId: draft.categoryId || null,
      unit: draft.unit,
      priceRupees: Number(draft.priceRupees),
      gstRate: draft.gstRate,
      stockQty: Number(draft.stockQty),
      lowStockQty: Number(draft.lowStockQty),
    };
    if (draft.id) await api(`/api/items/${draft.id}`, { method: "PATCH", body: JSON.stringify(body) });
    else await api("/api/items", { method: "POST", body: JSON.stringify(body) });
    setDraft(null);
    await load();
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] muted">Inventory</p>
          <h1 className="font-display text-4xl">Stock</h1>
        </div>
        <HeaderActions>
          <HeaderButton icon={<IconFilter />} aria-pressed={lowOnly} onClick={() => setLowOnly((value) => !value)}>
            Low stock
          </HeaderButton>
          <HeaderLink href="/purchases" icon={<IconScan />}>Scan purchase</HeaderLink>
          <HeaderButton variant="primary" icon={<IconPlus />} onClick={() => setDraft(blank())}>Add item</HeaderButton>
        </HeaderActions>
      </div>
      <div className="mt-4">
        <input className="field" placeholder="Search stock" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search stock" />
      </div>
      {error ? <p className="mt-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
      <ul className="mt-4 grid gap-2">
        {visible.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="surface flex w-full items-center justify-between gap-3 p-3 text-left"
              onClick={() => setDraft({
                id: item.id,
                name: item.name,
                barcode: item.barcode || "",
                categoryId: item.category_id || "",
                unit: item.unit,
                priceRupees: (item.price_paise / 100).toFixed(2),
                gstRate: item.gst_rate,
                stockQty: String(item.stock_qty),
                lowStockQty: String(item.low_stock_qty),
              })}
            >
              <span>
                <span className="block font-semibold">{item.name}</span>
                <span className="text-sm muted">{item.category_name} · GST {item.gst_rate}%</span>
              </span>
              <span className="text-right">
                <span className="block font-display text-2xl leading-none">{formatINR(item.price_paise)}</span>
                <span className={`text-sm font-bold ${item.stock_qty <= item.low_stock_qty ? "text-[var(--warn)]" : "muted"}`}>{item.stock_qty} {item.unit}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {draft ? (
        <form onSubmit={save} className="fixed inset-0 z-40 grid content-end bg-black/70 p-4">
          <div className="surface grid max-h-[85dvh] gap-3 overflow-auto p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-3xl">{draft.id ? "Edit item" : "New item"}</p>
              <HeaderActions>
                <HeaderButton icon={<IconClose />} onClick={() => setDraft(null)}>Close</HeaderButton>
              </HeaderActions>
            </div>
            <input className="field" required placeholder="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            <input className="field" placeholder="Barcode" value={draft.barcode} onChange={(event) => setDraft({ ...draft, barcode: event.target.value })} />
            <select className="field" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>
              <option value="">No category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select className="field" value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })}>
                {UNITS.map((unit) => <option key={unit}>{unit}</option>)}
              </select>
              <select className="field" value={draft.gstRate} onChange={(event) => setDraft({ ...draft, gstRate: Number(event.target.value) })}>
                {GST.map((rate) => <option key={rate} value={rate}>GST {rate}%</option>)}
              </select>
            </div>
            <input className="field" required inputMode="decimal" placeholder="Selling price" value={draft.priceRupees} onChange={(event) => setDraft({ ...draft, priceRupees: event.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="field" inputMode="decimal" placeholder="Stock" value={draft.stockQty} onChange={(event) => setDraft({ ...draft, stockQty: event.target.value })} />
              <input className="field" inputMode="decimal" placeholder="Low at" value={draft.lowStockQty} onChange={(event) => setDraft({ ...draft, lowStockQty: event.target.value })} />
            </div>
            <button className="btn btn-primary" type="submit">Save</button>
            {draft.id ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={async () => {
                  await api(`/api/items/${draft.id}`, { method: "DELETE" });
                  setDraft(null);
                  await load();
                }}
              >
                Archive
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
