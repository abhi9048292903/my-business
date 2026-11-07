"use client";

import { useEffect, useState } from "react";
import { api, type BillView } from "@/lib/client/types";
import { formatINR } from "@/lib/money";
import { QrMark } from "./QrMark";

export function PayScreen({ id }: { id: string }) {
  const [bill, setBill] = useState<BillView | null>(null);
  const [shopName, setShopName] = useState("Hisaab");
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    const pull = () => {
      api<{ invoice: BillView }>(`/api/invoices/${id}`)
        .then((data) => {
          if (!stop) setBill(data.invoice);
        })
        .catch((err) => {
          if (!stop) setError(err instanceof Error ? err.message : "Bill not found");
        });
    };
    api<{ merchant: { business_name: string } }>("/api/merchant")
      .then((data) => setShopName(data.merchant.business_name))
      .catch(() => {});
    pull();
    const timer = setInterval(pull, 2000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [id]);

  if (error) return <main className="grid min-h-dvh place-items-center bg-black text-white">{error}</main>;
  if (!bill) return <main className="grid min-h-dvh place-items-center bg-black text-white">Loading bill…</main>;

  return (
    <main className="flex min-h-dvh flex-col items-center bg-black px-5 py-8 text-white">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/70">{shopName}</p>
      <h1 className="font-display mt-3 text-6xl">{formatINR(bill.total_paise)}</h1>
      <p className="mt-2" aria-live="polite">{bill.status === "PAID" ? "Paid. Thank you." : bill.status === "CREDIT" ? "On account" : "Scan or open your UPI app"}</p>
      {bill.upi_uri && bill.status !== "PAID" ? (
        <>
          <div className="mt-6 w-full max-w-[280px] rounded-3xl bg-white p-4">
            <QrMark text={bill.upi_uri} />
          </div>
          <a className="btn mt-6 bg-white text-black" href={bill.upi_uri}>Pay with UPI</a>
        </>
      ) : null}
      <ul className="mt-8 w-full max-w-md text-sm text-white/80">
        {bill.lines?.map((line, index) => (
          <li key={`${line.name}-${index}`} className="flex justify-between gap-3 py-1">
            <span>{line.name} × {line.qty}</span>
            <span>{formatINR(line.line_total_paise)}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
