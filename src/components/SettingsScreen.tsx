"use client";

import { useEffect, useState } from "react";
import { api, rememberShop, type Shop } from "@/lib/client/types";

const THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "contrast", label: "Sunlight" },
];

export function SettingsScreen() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState("light");

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
      }),
    });
    rememberShop(data.merchant);
    setShop(data.merchant);
    setMessage("Saved");
  }

  function chooseTheme(next: string) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("hisaab-theme", next);
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <div className="mx-auto max-w-lg">
      <p className="text-xs font-bold uppercase tracking-[0.16em] muted">Shop</p>
      <h1 className="font-display text-4xl">Settings</h1>
      <form onSubmit={save} className="mt-4 grid gap-3">
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
        <button className="btn btn-primary" type="submit">Save shop</button>
      </form>
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
      {message ? <p className="mt-3 font-semibold">{message}</p> : null}
    </div>
  );
}
