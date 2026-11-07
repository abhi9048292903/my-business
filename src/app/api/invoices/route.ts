import { NextResponse } from "next/server";
import { createInvoice, listInvoices } from "@/lib/billing";
import { jsonError, originFrom, readJson } from "@/lib/http";
import type { CartInputLine, GstMode } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const status = new URL(request.url).searchParams.get("status") || undefined;
  return NextResponse.json({ invoices: listInvoices(status) });
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      lines?: CartInputLine[];
      gstMode?: GstMode;
      billDiscountPercent?: number;
      paymentMode?: "UPI" | "CASH" | "CREDIT";
      customerId?: string | null;
      notes?: string;
      clientId?: string | null;
    }>(request);
    if (!body.lines?.length) return jsonError("Add at least one item");
    if (!body.paymentMode) return jsonError("Choose UPI, cash, or udhar");
    const invoice = createInvoice({
      lines: body.lines,
      gstMode: body.gstMode === "NON_GST" ? "NON_GST" : "GST",
      billDiscountPercent: body.billDiscountPercent,
      paymentMode: body.paymentMode,
      customerId: body.customerId,
      notes: body.notes,
      clientId: body.clientId,
    });
    return NextResponse.json(
      { invoice, payUrl: `${originFrom(request)}/pay/${invoice.id}` },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create bill");
  }
}
