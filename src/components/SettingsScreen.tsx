"use client";

import { useEffect, useState } from "react";
import { api, rememberShop, type Shop } from "@/lib/client/types";

const THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "contrast", label: "Sunlight" },
];

const BUSINESS_TYPES = [
  { id: "freelance", label: "Freelance & Consulting" },
  { id: "staffing", label: "Human Resources & Staffing" },
  { id: "retail", label: "Retail & Goods" },
  { id: "hybrid", label: "Hybrid (Services & Goods)" },
];

export function SettingsScreen() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState("light");
  const [presetBusy, setPresetBusy] = useState(false);
  const [presetMode, setPresetMode] = useState<"append" | "replace">("append");

  useEffect(() => {
    api<{ merchant: Shop }>("/api/merchant").then((data) => setShop(data.merchant)).catch(() => {});
    setTheme(document.documentElement.dataset.theme || "light");
  }, []);

  if (!shop) return <p>Loading shop…</p>;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!shop) return;
    const data = await api<{ merchant: Shop }>("/api/merchant", {
      method: "PATCH",
      body: JSON.stringify({
        businessName: shop.business_name,
        mobile: shop.mobile,
        upiVpa: shop.upi_vpa,
        gstin: shop.gstin || "",
        address: shop.address || "",
        printerWidth: shop.printer_width,
        businessType: shop.business_type || "retail",
      }),
    });
    rememberShop(data.merchant);
    setShop(data.merchant);
    setMessage("Business profile saved successfully.");
  }

  async function applyPreset(type: string) {
    if (!confirm(`Are you sure you want to ${presetMode} ${type} services to your catalog?`)) return;
    setPresetBusy(true);
    setMessage("");
    try {
      const res = await api<{ success: boolean; stats: { itemsCount: number; categoriesCount: number } }>(
        "/api/catalog/preset",
        {
          method: "POST",
          body: JSON.stringify({ businessType: type, mode: presetMode }),
        }
      );
      setMessage(`Added ${res.stats.itemsCount} catalog items & ${res.stats.categoriesCount} categories for ${type}!`);
      // Update local storage catalog cache
      const freshCatalog = await api("/api/items");
      localStorage.setItem("hisaab-catalog", JSON.stringify(freshCatalog));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load preset");
    } finally {
      setPresetBusy(false);
    }
  }

  function chooseTheme(next: string) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("hisaab-theme", next);
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <div className="mx-auto max-w-lg pb-10">
      <p className="text-xs font-bold uppercase tracking-[0.16em] muted">Business Configuration</p>
      <h1 className="font-display text-4xl">Settings</h1>

      <form onSubmit={save} className="mt-4 grid gap-3">
        <div>
          <label className="text-sm font-semibold">Business Model & Services Type</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {BUSINESS_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                className="pill text-center py-2 text-xs font-bold"
                aria-pressed={(shop.business_type || "retail") === type.id}
                onClick={() => setShop({ ...shop, business_type: type.id })}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <label className="text-sm font-semibold">Business name
          <input className="field mt-1" value={shop.business_name} onChange={(event) => setShop({ ...shop, business_name: event.target.value })} />
        </label>
        <label className="text-sm font-semibold">Mobile
          <input className="field mt-1" value={shop.mobile} onChange={(event) => setShop({ ...shop, mobile: event.target.value })} />
        </label>
        <label className="text-sm font-semibold">UPI ID
          <input className="field mt-1" value={shop.upi_vpa} onChange={(event) => setShop({ ...shop, upi_vpa: event.target.value })} />
        </label>
        <label className="text-sm font-semibold">GSTIN
          <input className="field mt-1" value={shop.gstin || ""} onChange={(event) => setShop({ ...shop, gstin: event.target.value })} />
        </label>
        <label className="text-sm font-semibold">Address
          <input className="field mt-1" value={shop.address || ""} onChange={(event) => setShop({ ...shop, address: event.target.value })} />
        </label>
        <div className="flex gap-2">
          {["58", "80"].map((width) => (
            <button key={width} type="button" className="pill" aria-pressed={shop.printer_width === width} onClick={() => setShop({ ...shop, printer_width: width })}>
              {width} mm print
            </button>
          ))}
        </div>
        <button className="btn btn-primary" type="submit">Save Business Profile</button>
      </form>

      {/* Catalog & Service Presets */}
      <div className="surface mt-6 p-4">
        <p className="font-semibold text-base">Service & Catalog Presets</p>
        <p className="text-xs muted mt-1">
          Instantly load ready-to-bill freelance services or human resource staffing profiles into your catalog.
        </p>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-semibold">Mode:</span>
          <button
            type="button"
            className="pill text-xs"
            aria-pressed={presetMode === "append"}
            onClick={() => setPresetMode("append")}
          >
            Append (keep existing)
          </button>
          <button
            type="button"
            className="pill text-xs"
            aria-pressed={presetMode === "replace"}
            onClick={() => setPresetMode("replace")}
          >
            Replace catalog
          </button>
        </div>

        <div className="mt-3 grid gap-2">
          <button
            type="button"
            disabled={presetBusy}
            onClick={() => applyPreset("freelance")}
            className="btn btn-ghost text-left flex justify-between items-center text-sm py-2 px-3"
          >
            <span>+ Load Freelance Services (Web Dev, UI/UX, SEO, Consulting)</span>
            <span className="text-xs font-bold muted">hr / project</span>
          </button>
          <button
            type="button"
            disabled={presetBusy}
            onClick={() => applyPreset("staffing")}
            className="btn btn-ghost text-left flex justify-between items-center text-sm py-2 px-3"
          >
            <span>+ Load Human Resources & Staffing (Engineers, DevOps, Trades)</span>
            <span className="text-xs font-bold muted">month / day</span>
          </button>
          <button
            type="button"
            disabled={presetBusy}
            onClick={() => applyPreset("retail")}
            className="btn btn-ghost text-left flex justify-between items-center text-sm py-2 px-3"
          >
            <span>+ Load Retail / Grocery Goods</span>
            <span className="text-xs font-bold muted">pcs / kg</span>
          </button>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold">Theme</p>
        <div className="mt-2 flex gap-2">
          {THEMES.map((entry) => (
            <button key={entry.id} type="button" className="pill" aria-pressed={theme === entry.id} onClick={() => chooseTheme(entry.id)}>{entry.label}</button>
          ))}
        </div>
      </div>

      <div className="surface mt-6 grid gap-2 p-4 text-sm">
        <p className="font-semibold">Payment webhook</p>
        <p className="muted">Your bank or SMS forwarder posts here with header <span className="font-bold">x-webhook-secret</span>. The UPI PIN is never stored.</p>
        <code className="break-all">{origin}/api/webhooks/upi</code>
        <code className="break-all">{origin}/api/webhooks/sms</code>
        <code className="break-all">{shop.webhook_secret}</code>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => navigator.clipboard.writeText(shop.webhook_secret).then(() => setMessage("Secret copied"))}
        >
          Copy secret
        </button>
      </div>
      {message ? <p className="mt-3 font-semibold text-emerald-600">{message}</p> : null}
    </div>
  );
}
