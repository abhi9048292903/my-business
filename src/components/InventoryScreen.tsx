"use client";

import { useEffect, useState } from "react";
import { HeaderActions, HeaderButton, HeaderLink, IconClose, IconFilter, IconPlus, IconScan } from "@/components/HeaderActions";
import { api, type CatalogItem, type Category } from "@/lib/client/types";
import { formatINR } from "@/lib/money";

const PRODUCT_UNITS = ["pcs", "kg", "g", "L", "ml", "pack", "dozen"];
const SERVICE_UNITS = ["hr", "day", "month", "project", "resource", "person", "shift", "visit"];
const GST_RATES = [0, 5, 12, 18, 28];

type Draft = {
  id?: string;
  name: string;
  itemType: "product" | "service";
  serviceType: string;
  skills: string;
  barcode: string;
  categoryId: string;
  unit: string;
  priceRupees: string;
  gstRate: number;
  stockQty: string;
  lowStockQty: string;
};

const blankProduct = (): Draft => ({
  name: "",
  itemType: "product",
  serviceType: "",
  skills: "",
  barcode: "",
  categoryId: "",
  unit: "pcs",
  priceRupees: "",
  gstRate: 0,
  stockQty: "10",
  lowStockQty: "5",
});

const blankService = (serviceType = "freelance"): Draft => ({
  name: "",
  itemType: "service",
  serviceType,
  skills: "",
  barcode: "",
  categoryId: "",
  unit: serviceType === "staffing" ? "month" : "hr",
  priceRupees: "",
  gstRate: 18,
  stockQty: "0",
  lowStockQty: "0",
});

export function InventoryScreen() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "SERVICES" | "PRODUCTS">("ALL");
  const [serviceSubFilter, setServiceSubFilter] = useState<"ALL" | "freelance" | "staffing">("ALL");
  const [lowOnly, setLowOnly] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const data = await api<{ items: CatalogItem[]; categories: Category[] }>("/api/items");
    setItems(data.items);
    setCategories(data.categories);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load catalog"));
  }, []);

  const serviceCount = items.filter((i) => i.item_type === "service").length;
  const productCount = items.filter((i) => i.item_type !== "service").length;

  const visible = items.filter((item) => {
    const isService = item.item_type === "service";
    if (typeFilter === "SERVICES" && !isService) return false;
    if (typeFilter === "PRODUCTS" && isService) return false;
    if (typeFilter === "SERVICES" && serviceSubFilter !== "ALL" && item.service_type !== serviceSubFilter) {
      return false;
    }

    const q = query.trim().toLowerCase();
    const searchTarget = `${item.name} ${item.barcode || ""} ${item.skills || ""} ${item.service_type || ""}`.toLowerCase();
    const matchesSearch = !q || searchTarget.includes(q);

    const isLow = isService ? false : item.stock_qty <= item.low_stock_qty;
    const matchesLow = !lowOnly || isLow;

    return matchesSearch && matchesLow;
  });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const isService = draft.itemType === "service";
    const body = {
      name: draft.name,
      itemType: draft.itemType,
      serviceType: isService ? draft.serviceType : null,
      skills: isService ? draft.skills : null,
      barcode: isService ? null : draft.barcode,
      categoryId: draft.categoryId || null,
      unit: draft.unit,
      priceRupees: Number(draft.priceRupees),
      gstRate: draft.gstRate,
      trackStock: isService ? 0 : 1,
      stockQty: isService ? 0 : Number(draft.stockQty || 0),
      lowStockQty: isService ? 0 : Number(draft.lowStockQty || 0),
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
          <p className="text-xs font-bold uppercase tracking-[0.16em] muted">Business Catalog</p>
          <h1 className="font-display text-4xl">Items & Services</h1>
        </div>
        <HeaderActions>
          <HeaderButton icon={<IconFilter />} aria-pressed={lowOnly} onClick={() => setLowOnly((value) => !value)}>
            Low stock
          </HeaderButton>
          <HeaderLink href="/purchases" icon={<IconScan />}>Scan bill</HeaderLink>
          <div className="flex gap-1">
            <HeaderButton
              variant="primary"
              icon={<IconPlus />}
              onClick={() => setDraft(blankService("freelance"))}
            >
              + Service
            </HeaderButton>
            <HeaderButton
              icon={<IconPlus />}
              onClick={() => setDraft(blankProduct())}
            >
              + Product
            </HeaderButton>
          </div>
        </HeaderActions>
      </div>

      {/* Filter Tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="pill text-xs"
          aria-pressed={typeFilter === "ALL"}
          onClick={() => {
            setTypeFilter("ALL");
            setServiceSubFilter("ALL");
          }}
        >
          All ({items.length})
        </button>
        <button
          type="button"
          className="pill text-xs"
          aria-pressed={typeFilter === "SERVICES"}
          onClick={() => setTypeFilter("SERVICES")}
        >
          Services ({serviceCount})
        </button>
        <button
          type="button"
          className="pill text-xs"
          aria-pressed={typeFilter === "PRODUCTS"}
          onClick={() => {
            setTypeFilter("PRODUCTS");
            setServiceSubFilter("ALL");
          }}
        >
          Products ({productCount})
        </button>

        {typeFilter === "SERVICES" ? (
          <div className="ml-2 flex items-center gap-1 border-l border-[var(--line)] pl-2">
            <button
              type="button"
              className="pill text-xs"
              aria-pressed={serviceSubFilter === "ALL"}
              onClick={() => setServiceSubFilter("ALL")}
            >
              All Services
            </button>
            <button
              type="button"
              className="pill text-xs"
              aria-pressed={serviceSubFilter === "freelance"}
              onClick={() => setServiceSubFilter("freelance")}
            >
              Freelance Work
            </button>
            <button
              type="button"
              className="pill text-xs"
              aria-pressed={serviceSubFilter === "staffing"}
              onClick={() => setServiceSubFilter("staffing")}
            >
              Human Resources
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        <input
          className="field"
          placeholder="Search by name, skill (e.g. React, Python), barcode..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search catalog"
        />
      </div>

      {error ? <p className="mt-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}

      <ul className="mt-4 grid gap-2">
        {visible.map((item) => {
          const isService = item.item_type === "service";
          return (
            <li key={item.id}>
              <button
                type="button"
                className="surface flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:border-[var(--ink)]"
                onClick={() =>
                  setDraft({
                    id: item.id,
                    name: item.name,
                    itemType: item.item_type || "product",
                    serviceType: item.service_type || "freelance",
                    skills: item.skills || "",
                    barcode: item.barcode || "",
                    categoryId: item.category_id || "",
                    unit: item.unit,
                    priceRupees: (item.price_paise / 100).toFixed(2),
                    gstRate: item.gst_rate,
                    stockQty: String(item.stock_qty),
                    lowStockQty: String(item.low_stock_qty),
                  })
                }
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{item.name}</span>
                    {isService ? (
                      <span className="rounded-full bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-300">
                        {item.service_type === "staffing"
                          ? "HR / Talent"
                          : item.service_type === "freelance"
                          ? "Freelance Work"
                          : "Service"}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs muted">
                    {item.category_name ? <span>{item.category_name}</span> : null}
                    <span>· GST {item.gst_rate}%</span>
                    {item.skills ? (
                      <span className="font-medium text-[var(--ink)] opacity-80">
                        · Skills: {item.skills}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl leading-none">{formatINR(item.price_paise)}</div>
                  <div className="mt-1 text-xs font-bold">
                    {isService ? (
                      <span className="text-blue-600 dark:text-blue-400">Rate per {item.unit}</span>
                    ) : (
                      <span className={item.stock_qty <= item.low_stock_qty ? "text-[var(--warn)]" : "muted"}>
                        {item.stock_qty} {item.unit}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Edit / Add Modal */}
      {draft ? (
        <form onSubmit={save} className="fixed inset-0 z-40 grid content-end bg-black/70 p-4">
          <div className="surface grid max-h-[90dvh] gap-3 overflow-auto p-4 sm:max-w-xl sm:mx-auto sm:w-full sm:rounded-2xl">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-2xl">
                {draft.id ? "Edit Item / Service" : "New Item / Service"}
              </p>
              <HeaderActions>
                <HeaderButton icon={<IconClose />} onClick={() => setDraft(null)}>Close</HeaderButton>
              </HeaderActions>
            </div>

            {/* Type Switcher */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider muted">Type</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="pill py-2 text-sm font-semibold"
                  aria-pressed={draft.itemType === "service"}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      itemType: "service",
                      serviceType: draft.serviceType || "freelance",
                      unit: SERVICE_UNITS.includes(draft.unit) ? draft.unit : "hr",
                      gstRate: 18,
                    })
                  }
                >
                  ⚡ Service (Freelance / HR)
                </button>
                <button
                  type="button"
                  className="pill py-2 text-sm font-semibold"
                  aria-pressed={draft.itemType === "product"}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      itemType: "product",
                      unit: PRODUCT_UNITS.includes(draft.unit) ? draft.unit : "pcs",
                    })
                  }
                >
                  📦 Physical Product
                </button>
              </div>
            </div>

            {draft.itemType === "service" ? (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--elev)] p-3 grid gap-2">
                <label className="text-xs font-bold uppercase tracking-wider muted">Service Classification</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="pill text-xs py-1.5"
                    aria-pressed={draft.serviceType === "freelance"}
                    onClick={() => setDraft({ ...draft, serviceType: "freelance", unit: "hr" })}
                  >
                    Freelance Work
                  </button>
                  <button
                    type="button"
                    className="pill text-xs py-1.5"
                    aria-pressed={draft.serviceType === "staffing"}
                    onClick={() => setDraft({ ...draft, serviceType: "staffing", unit: "month" })}
                  >
                    Human Resources / Talent
                  </button>
                </div>
                <label className="text-xs font-semibold mt-1">
                  Skills & Specialized Tech
                  <input
                    className="field mt-1 text-sm"
                    placeholder="e.g. React, Next.js, TypeScript, AWS or Certified 3-Phase Electrician"
                    value={draft.skills}
                    onChange={(event) => setDraft({ ...draft, skills: event.target.value })}
                  />
                </label>
              </div>
            ) : null}

            <label className="text-xs font-semibold">
              {draft.itemType === "service" ? "Service / Role Name" : "Item Name"}
              <input
                className="field mt-1"
                required
                placeholder={
                  draft.itemType === "service"
                    ? draft.serviceType === "staffing"
                      ? "e.g. Senior Frontend Engineer (Staffing Placement)"
                      : "e.g. Full-Stack Web App Development"
                    : "e.g. Basmati Rice"
                }
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </label>

            {draft.itemType === "product" ? (
              <label className="text-xs font-semibold">
                Barcode (optional)
                <input
                  className="field mt-1"
                  placeholder="8901001000011"
                  value={draft.barcode}
                  onChange={(event) => setDraft({ ...draft, barcode: event.target.value })}
                />
              </label>
            ) : null}

            <label className="text-xs font-semibold">
              Category
              <select
                className="field mt-1"
                value={draft.categoryId}
                onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold">
                Billing Unit
                <select
                  className="field mt-1"
                  value={draft.unit}
                  onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
                >
                  {(draft.itemType === "service" ? SERVICE_UNITS : PRODUCT_UNITS).map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold">
                GST Rate
                <select
                  className="field mt-1"
                  value={draft.gstRate}
                  onChange={(event) => setDraft({ ...draft, gstRate: Number(event.target.value) })}
                >
                  {GST_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      GST {rate}%
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="text-xs font-semibold">
              {draft.itemType === "service" ? `Rate per ${draft.unit} (₹)` : "Selling price (₹)"}
              <input
                className="field mt-1"
                required
                inputMode="decimal"
                placeholder={draft.itemType === "service" ? "2500" : "50"}
                value={draft.priceRupees}
                onChange={(event) => setDraft({ ...draft, priceRupees: event.target.value })}
              />
            </label>

            {draft.itemType === "product" ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold">
                  Current Stock
                  <input
                    className="field mt-1"
                    inputMode="decimal"
                    placeholder="Stock"
                    value={draft.stockQty}
                    onChange={(event) => setDraft({ ...draft, stockQty: event.target.value })}
                  />
                </label>
                <label className="text-xs font-semibold">
                  Low Stock Alert
                  <input
                    className="field mt-1"
                    inputMode="decimal"
                    placeholder="Low at"
                    value={draft.lowStockQty}
                    onChange={(event) => setDraft({ ...draft, lowStockQty: event.target.value })}
                  />
                </label>
              </div>
            ) : null}

            <button className="btn btn-primary mt-2" type="submit">
              {draft.id ? "Update" : "Create"} {draft.itemType === "service" ? "Service" : "Item"}
            </button>

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
