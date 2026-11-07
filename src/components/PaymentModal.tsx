"use client";

import { useEffect, useRef, useState } from "react";
import { announcePayment } from "@/lib/client/audio";
import { api, rememberedShop, type BillView, type Shop } from "@/lib/client/types";
import { formatINR } from "@/lib/money";
import { smsHref, whatsAppHref } from "@/lib/whatsapp";
import { HeaderActions, HeaderButton, IconClose } from "./HeaderActions";
import { QrMark } from "./QrMark";

export function PaymentModal({
  bill,
  payUrl,
  customerMobile,
  onClose,
  onChanged,
}: {
  bill: BillView;
  payUrl: string;
  customerMobile?: string | null;
  onClose: () => void;
  onChanged: (bill: BillView) => void;
}) {
  const [current, setCurrent] = useState(bill);
  const [error, setError] = useState("");
  const [shop, setShop] = useState<Shop | null>(null);
  const spoken = useRef(false);

  useEffect(() => {
    setShop(rememberedShop());
  }, []);

  useEffect(() => {
    if (current.local || current.status !== "UNPAID") return;
    const source = new EventSource(`/api/invoices/${current.id}/events`);
    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { status?: string; invoice?: BillView; spoken?: string };
      if (payload.invoice) {
        setCurrent({ ...payload.invoice, lines: payload.invoice.lines || current.lines });
        onChanged({ ...payload.invoice, lines: payload.invoice.lines || current.lines });
      }
      if (payload.status === "PAID") speak(payload.spoken);
    };
    return () => source.close();
  }, [current.id, current.local, current.status]);

  function speak(message?: string) {
    if (spoken.current) return;
    spoken.current = true;
    const rupees = (current.total_paise / 100).toFixed(current.total_paise % 100 === 0 ? 0 : 2);
    announcePayment(message || `Payment of ₹${rupees} received successfully via UPI`);
  }

  async function confirmPaid() {
    setError("");
    const secret = shop?.webhook_secret;
    if (!secret) {
      setError("Shop profile is not on this phone yet.");
      return;
    }
    try {
      const data = await api<{ invoice: BillView }>("/api/webhooks/upi", {
        method: "POST",
        headers: { "x-webhook-secret": secret },
        body: JSON.stringify({
          invoiceId: current.id,
          amountPaise: current.total_paise,
          utr: `DEMO${Date.now().toString().slice(-10)}`,
        }),
      });
      const next = { ...data.invoice, lines: data.invoice.lines || current.lines };
      setCurrent(next);
      onChanged(next);
      speak();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm");
    }
  }

  const business = shop?.business_name || "Hisaab";
  const share = {
    mobile: customerMobile,
    businessName: business,
    invoiceNumber: current.number,
    totalPaise: current.total_paise,
    payUrl,
  };
  const waiting = current.status === "UNPAID" && current.payment_mode === "UPI" && !current.local;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-labelledby="pay-title">
      <div className="flex items-center justify-between px-4 py-3">
        <p id="pay-title" className="text-sm font-bold uppercase tracking-[0.16em] text-white/70">
          {current.number}
        </p>
        <HeaderActions>
          <HeaderButton variant="inverse" icon={<IconClose />} onClick={onClose}>Close</HeaderButton>
        </HeaderActions>
      </div>
      <div className="flex flex-1 flex-col items-center px-5 pb-8">
        <p className="text-sm font-semibold text-white/70">{current.customer_name || business}</p>
        <p className="font-display mt-1 text-6xl leading-none sm:text-7xl">{formatINR(current.total_paise)}</p>
        <p className="mt-3 text-center text-lg" aria-live="polite">
          {current.local
            ? "Saved on this phone. The QR is locked to this amount and will sync when the network returns."
            : current.status === "PAID"
              ? "Payment received"
              : current.status === "CREDIT"
                ? "Added to khata"
                : "Waiting for payment…"}
        </p>
        {current.upi_uri && current.status !== "CREDIT" ? (
          <div className="mt-5 w-full max-w-[280px] rounded-3xl bg-white p-4">
            <QrMark text={current.upi_uri} />
          </div>
        ) : null}
        {current.upi_uri && current.status !== "CREDIT" ? <p className="mt-3 break-all text-center text-xs text-white/60">{current.upi_uri}</p> : null}
        {error ? <p className="mt-3 text-sm font-semibold text-[#ffe14a]">{error}</p> : null}
        <div className="mt-6 grid w-full max-w-md grid-cols-2 gap-2">
          {waiting ? (
            <button type="button" className="btn btn-warm col-span-2" onClick={confirmPaid}>
              Confirm UPI received
            </button>
          ) : null}
          <a className="btn bg-white text-black" href={whatsAppHref({ ...share, mobile: current.customer_name ? undefined : undefined })} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <a className="btn border border-white/40 text-white" href={smsHref(share)}>
            SMS
          </a>
          {current.local ? null : (
            <a className="btn border border-white/40 text-white" href={`/api/invoices/${current.id}/pdf`}>
              PDF
            </a>
          )}
          <button type="button" className="btn border border-white/40 text-white" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>
      <article id="receipt" className="hidden print:block">
        <h1 className="text-lg font-bold">{business}</h1>
        <p>{current.number}</p>
        <p>{current.customer_name}</p>
        <ul>
          {current.lines.map((line, index) => (
            <li key={`${line.name}-${index}`}>
              {line.name} × {line.qty} {line.unit} — {formatINR(line.line_total_paise)}
              {line.note ? ` (${line.note})` : ""}
            </li>
          ))}
        </ul>
        <p className="text-lg font-bold">Total {formatINR(current.total_paise)}</p>
        <p>{current.payment_mode} · {current.status}</p>
      </article>
    </div>
  );
}
