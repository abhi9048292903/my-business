"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/types";
import { formatINR } from "@/lib/money";
import { SAMPLE_PURCHASE_BILL } from "@/lib/purchase-parse";

type DraftLine = {
  name: string;
  qty: number;
  unit: string;
  unitCostPaise: number;
  itemId: string | null;
  createNew: boolean;
  sellingPricePaise: number;
  include: boolean;
};

export function PurchasesScreen() {
  const [text, setText] = useState("");
  const [supplier, setSupplier] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [history, setHistory] = useState<Array<{ id: string; supplier_name: string | null; invoice_no: string | null; total_paise: number }>>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api<{ purchases: typeof history }>("/api/purchases").then((data) => setHistory(data.purchases)).catch(() => {});
  }, []);

  async function parse(source: string) {
    const data = await api<{
      supplierName: string | null;
      invoiceNo: string | null;
      lines: Array<{ name: string; qty: number; unit: string; unitCostPaise: number; itemId: string | null; createNew: boolean }>;
    }>("/api/purchases", { method: "POST", body: JSON.stringify({ action: "parse", text: source }) });
    setSupplier(data.supplierName || "");
    setInvoiceNo(data.invoiceNo || "");
    setLines(data.lines.map((line) => ({ ...line, sellingPricePaise: line.unitCostPaise, include: true })));
    setStatus(data.lines.length ? `Read ${data.lines.length} lines` : "No item lines found");
  }

  async function readPhoto(file: File) {
    setStatus("Reading the bill…");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const result = await worker.recognize(file);
      await worker.terminate();
      setText(result.data.text);
      await parse(result.data.text);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not read the photo. Paste the bill text instead.");
    }
  }

  async function save() {
    const chosen = lines.filter((line) => line.include);
    await api("/api/purchases", {
      method: "POST",
      body: JSON.stringify({
        supplierName: supplier,
        invoiceNo,
        sourceText: text,
        lines: chosen.map((line) => ({
          name: line.name,
          qty: line.qty,
          unit: line.unit,
          unitCostPaise: line.unitCostPaise,
          itemId: line.itemId,
          createNew: line.createNew || !line.itemId,
          sellingPricePaise: line.sellingPricePaise,
        })),
      }),
    });
    setLines([]);
    setStatus("Stock updated");
    const data = await api<{ purchases: typeof history }>("/api/purchases");
    setHistory(data.purchases);
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] muted">Inward</p>
      <h1 className="font-display text-4xl">Purchase bill</h1>
      <p className="mt-2 muted">Photograph a distributor invoice or paste its lines. Confirm before stock moves.</p>
      <div className="mt-4 grid gap-2">
        <label className="btn btn-primary">
          Camera / photo
          <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readPhoto(file);
          }} />
        </label>
        <button type="button" className="btn btn-ghost" onClick={() => { setText(SAMPLE_PURCHASE_BILL); void parse(SAMPLE_PURCHASE_BILL); }}>
          Load sample distributor bill
        </button>
        <textarea className="field min-h-36 py-3" value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste invoice text" aria-label="Purchase bill text" />
        <button type="button" className="btn btn-ghost" onClick={() => parse(text)}>Read text</button>
      </div>
      {status ? <p className="mt-3 font-semibold">{status}</p> : null}
      {lines.length ? (
        <div className="mt-4 grid gap-3">
          <input className="field" value={supplier} onChange={(event) => setSupplier(event.target.value)} aria-label="Supplier" />
          <input className="field" value={invoiceNo} onChange={(event) => setInvoiceNo(event.target.value)} aria-label="Supplier invoice number" />
          {lines.map((line, index) => (
            <div key={`${line.name}-${index}`} className="surface grid gap-2 p-3">
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={line.include} onChange={(event) => setLines(lines.map((entry, i) => i === index ? { ...entry, include: event.target.checked } : entry))} />
                {line.name} {line.itemId ? "" : "· new item"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="text-xs font-bold muted">Qty
                  <input className="field mt-1" aria-label={`${line.name} quantity`} value={line.qty} onChange={(event) => setLines(lines.map((entry, i) => i === index ? { ...entry, qty: Number(event.target.value) } : entry))} />
                </label>
                <label className="text-xs font-bold muted">Cost
                  <input className="field mt-1" aria-label={`${line.name} cost`} value={(line.unitCostPaise / 100).toFixed(2)} onChange={(event) => setLines(lines.map((entry, i) => i === index ? { ...entry, unitCostPaise: Math.round(Number(event.target.value) * 100) } : entry))} />
                </label>
                <label className="text-xs font-bold muted">Sell if new
                  <input className="field mt-1" aria-label={`${line.name} selling price`} value={(line.sellingPricePaise / 100).toFixed(2)} onChange={(event) => setLines(lines.map((entry, i) => i === index ? { ...entry, sellingPricePaise: Math.round(Number(event.target.value) * 100) } : entry))} />
                </label>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-warm" onClick={() => save().catch((error) => setStatus(error instanceof Error ? error.message : "Save failed"))}>
            Add to stock
          </button>
        </div>
      ) : null}
      <ul className="mt-6 grid gap-2">
        {history.map((purchase) => (
          <li key={purchase.id} className="flex justify-between text-sm">
            <span>{purchase.supplier_name || "Supplier"} · {purchase.invoice_no || "—"}</span>
            <span className="font-semibold">{formatINR(purchase.total_paise)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
