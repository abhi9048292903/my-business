"use client";

import { useEffect, useState } from "react";
import { HeaderActions, HeaderButton, IconClose } from "@/components/HeaderActions";
import { api, rememberedShop, type BillView } from "@/lib/client/types";
import { formatINR } from "@/lib/money";
import { smsHref, whatsAppHref } from "@/lib/whatsapp";

export function InvoicesScreen({ focusId }: { focusId?: string }) {
  const [invoices, setInvoices] = useState<BillView[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [open, setOpen] = useState<BillView | null>(null);
  const [error, setError] = useState("");

  async function load(status = filter) {
    const query = status === "ALL" ? "" : `?status=${status}`;
    const data = await api<{ invoices: BillView[] }>(`/api/invoices${query}`);
    setInvoices(data.invoices);
    return data.invoices;
  }

  useEffect(() => {
    load(filter)
      .then((rows) => {
        if (focusId) {
          const found = rows.find((invoice) => invoice.id === focusId);
          if (found) setOpen(found);
          else api<{ invoice: BillView }>(`/api/invoices/${focusId}`).then((data) => setOpen(data.invoice)).catch(() => {});
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load bills"));
  }, [filter, focusId]);

  const shop = typeof window === "undefined" ? null : rememberedShop();

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] muted">History</p>
      <h1 className="font-display text-4xl">Bills</h1>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {["ALL", "UNPAID", "PAID", "CREDIT", "CANCELLED"].map((status) => (
          <button key={status} type="button" className="pill" aria-pressed={filter === status} onClick={() => setFilter(status)}>
            {status === "ALL" ? "All" : status === "CREDIT" ? "Udhar" : status[0] + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
      <ul className="mt-4 grid gap-2">
        {invoices.map((invoice) => (
          <li key={invoice.id}>
            <button type="button" className="surface flex w-full items-center justify-between p-3 text-left" onClick={() => setOpen(invoice)}>
              <span>
                <span className="block font-semibold">{invoice.number}</span>
                <span className="text-sm muted">{invoice.customer_name || "Walk-in"} · {invoice.payment_mode}</span>
              </span>
              <span className="text-right">
                <span className="block font-display text-2xl leading-none">{formatINR(invoice.total_paise)}</span>
                <span className="text-xs font-bold">{invoice.status}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open ? (
        <div className="fixed inset-0 z-40 overflow-auto bg-[var(--bg)] p-4" role="dialog" aria-label={open.number}>
          <div className="mx-auto max-w-lg">
            <HeaderActions className="w-full">
              <HeaderButton icon={<IconClose />} onClick={() => setOpen(null)}>Close</HeaderButton>
            </HeaderActions>
            <p className="font-display mt-4 text-5xl">{formatINR(open.total_paise)}</p>
            <p className="mt-1 font-semibold">{open.number} · {open.status}</p>
            <ul className="mt-4 grid gap-2">
              {(open.lines || []).map((line, index) => (
                <li key={`${line.name}-${index}`} className="flex justify-between gap-3">
                  <span>{line.name} × {line.qty} {line.unit}{line.note ? ` · ${line.note}` : ""}</span>
                  <span className="font-semibold">{formatINR(line.line_total_paise)}</span>
                </li>
              ))}
            </ul>
            {open.lines ? null : <InvoiceLines id={open.id} onLoad={setOpen} />}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a className="btn btn-primary" href={`/api/invoices/${open.id}/pdf`}>PDF</a>
              <button type="button" className="btn btn-ghost" onClick={() => window.print()}>Print</button>
              <a className="btn btn-ghost" target="_blank" rel="noreferrer" href={whatsAppHref({
                mobile: null,
                businessName: shop?.business_name || "Hisaab",
                invoiceNumber: open.number,
                totalPaise: open.total_paise,
                payUrl: `${window.location.origin}/pay/${open.id}`,
              })}>WhatsApp</a>
              <a className="btn btn-ghost" href={smsHref({
                mobile: null,
                businessName: shop?.business_name || "Hisaab",
                invoiceNumber: open.number,
                totalPaise: open.total_paise,
                payUrl: `${window.location.origin}/pay/${open.id}`,
              })}>SMS</a>
            </div>
            {open.status !== "CANCELLED" ? (
              <button
                type="button"
                className="btn btn-ghost mt-3 w-full"
                onClick={async () => {
                  const data = await api<{ invoice: BillView }>(`/api/invoices/${open.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ action: "cancel" }),
                  });
                  setOpen(data.invoice);
                  await load();
                }}
              >
                Cancel and restock
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InvoiceLines({ id, onLoad }: { id: string; onLoad: (bill: BillView) => void }) {
  useEffect(() => {
    api<{ invoice: BillView }>(`/api/invoices/${id}`).then((data) => onLoad(data.invoice)).catch(() => {});
  }, [id, onLoad]);
  return null;
}
