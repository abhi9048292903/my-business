"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, rememberShop, type Shop } from "@/lib/client/types";

const BUSINESS_TYPES = [
  {
    id: "freelance",
    title: "Freelance & Consulting",
    desc: "Hourly/daily rates & project deliverables (web dev, UI/UX design, consulting)",
    placeholder: "Apex Freelance Studio",
  },
  {
    id: "staffing",
    title: "Human Resources & Staffing",
    desc: "Deploy skilled contractors & talent for specific skill works (engineers, technicians, specialists)",
    placeholder: "TalentBridge HR Solutions",
  },
  {
    id: "retail",
    title: "Retail & Goods",
    desc: "Physical shop, stock levels & barcode inventory (kirana, mart, counter)",
    placeholder: "Lakshmi Stores",
  },
  {
    id: "hybrid",
    title: "Hybrid (Services & Products)",
    desc: "Combine professional services, skilled resources, and physical products",
    placeholder: "Zenith Tech & Solutions",
  },
];

export function SetupScreen() {
  const router = useRouter();
  const [businessType, setBusinessType] = useState("freelance");
  const [businessName, setBusinessName] = useState("");
  const [mobile, setMobile] = useState("");
  const [upiVpa, setUpiVpa] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [sampleCatalog, setSampleCatalog] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ merchant: Shop }>("/api/merchant")
      .then(() => router.replace("/"))
      .catch(() => {});
  }, [router]);

  const selectedConfig = BUSINESS_TYPES.find((b) => b.id === businessType) || BUSINESS_TYPES[0];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ merchant: Shop }>("/api/merchant", {
        method: "POST",
        body: JSON.stringify({
          businessName,
          mobile,
          upiVpa,
          gstin,
          address,
          businessType,
          sampleCatalog,
        }),
      });
      rememberShop(data.merchant);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <p className="text-xs font-bold uppercase tracking-[0.18em] muted">Hisaab</p>
      <h1 className="font-display mt-2 text-5xl leading-none">Configure your business.</h1>
      <p className="mt-3 text-lg muted">
        Instant bills, locked UPI amounts, and khata ledger tailored for your business model and services.
      </p>
      <form onSubmit={submit} className="surface mt-8 grid gap-4 p-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Business Type & Model</label>
          <div className="grid gap-2">
            {BUSINESS_TYPES.map((type) => {
              const active = businessType === type.id;
              return (
                <button
                  type="button"
                  key={type.id}
                  onClick={() => setBusinessType(type.id)}
                  className={`rounded-2xl border p-3 text-left transition-colors ${
                    active ? "border-[var(--ink)] bg-[var(--elev)] ring-1 ring-[var(--ink)]" : "border-[var(--line)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{type.title}</span>
                    {active ? <span className="text-xs font-bold text-emerald-600">Selected</span> : null}
                  </div>
                  <p className="text-xs muted mt-1">{type.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <label className="grid gap-1 text-sm font-semibold">
          Business name
          <input
            className="field"
            required
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder={selectedConfig.placeholder}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Mobile number
          <input
            className="field"
            required
            inputMode="numeric"
            maxLength={10}
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            placeholder="98XXXXXXXX"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          UPI ID
          <input
            className="field"
            required
            value={upiVpa}
            onChange={(event) => setUpiVpa(event.target.value)}
            placeholder="business@okaxis"
            autoCapitalize="none"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          GSTIN <span className="font-normal muted">(optional)</span>
          <input
            className="field"
            value={gstin}
            onChange={(event) => setGstin(event.target.value)}
            placeholder="29ABCDE1234F1Z5"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Address <span className="font-normal muted">(optional)</span>
          <input
            className="field"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Bangalore, India"
          />
        </label>
        <label className="flex items-center gap-3 py-2 text-sm font-semibold cursor-pointer">
          <input
            type="checkbox"
            checked={sampleCatalog}
            onChange={(event) => setSampleCatalog(event.target.checked)}
          />
          <span>
            {businessType === "freelance"
              ? "Load sample freelance services & packages"
              : businessType === "staffing"
              ? "Load sample human resources & skilled talent catalog"
              : businessType === "hybrid"
              ? "Load sample services & products"
              : "Load sample grocery catalog"}
          </span>
        </label>
        {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? "Saving…" : "Start billing"}
        </button>
      </form>
    </main>
  );
}
