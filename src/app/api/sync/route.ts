import { NextResponse } from "next/server";
import { createInvoice, type CreateInvoiceInput } from "@/lib/billing";
import { jsonError, originFrom, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Flushes bills captured while offline. Totals are recomputed on the server. */
export async function POST(request: Request) {
  try {
    const body = await readJson<{ invoices?: CreateInvoiceInput[] }>(request);
    if (!body.invoices?.length) return NextResponse.json({ invoices: [] });
    const invoices = body.invoices.map((invoice) => {
      const saved = createInvoice(invoice);
      return { ...saved, payUrl: `${originFrom(request)}/pay/${saved.id}` };
    });
    return NextResponse.json({ invoices });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Sync failed");
  }
}
