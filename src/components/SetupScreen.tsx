"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, rememberShop, type Shop } from "@/lib/client/types";

export function SetupScreen() {
  const router = useRouter();
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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ merchant: Shop }>("/api/merchant", {
        method: "POST",
        body: JSON.stringify({ businessName, mobile, upiVpa, gstin, address, sampleCatalog }),
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
      <h1 className="font-display mt-2 text-5xl leading-none">Open the till.</h1>
      <p className="mt-3 text-lg muted">A bill, a locked UPI amount, and a khata that stays on this phone when the network drops.</p>
      <form onSubmit={submit} className="surface mt-8 grid gap-3 p-4">
        <label className="grid gap-1 text-sm font-semibold">
          Business name
          <input className="field" required value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Lakshmi Stores" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Mobile number
          <input className="field" required inputMode="numeric" maxLength={10} value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="98XXXXXXXX" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          UPI ID
          <input className="field" required value={upiVpa} onChange={(event) => setUpiVpa(event.target.value)} placeholder="shop@okaxis" autoCapitalize="none" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          GSTIN <span className="font-normal muted">(optional)</span>
          <input className="field" value={gstin} onChange={(event) => setGstin(event.target.value)} placeholder="29ABCDE1234F1Z5" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Address <span className="font-normal muted">(optional)</span>
          <input className="field" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Market Road, Kochi" />
        </label>
        <label className="flex items-center gap-3 py-2 text-sm font-semibold">
          <input type="checkbox" checked={sampleCatalog} onChange={(event) => setSampleCatalog(event.target.checked)} />
          Load a sample grocery catalog
        </label>
        {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? "Saving…" : "Start billing"}
        </button>
      </form>
    </main>
  );
}
