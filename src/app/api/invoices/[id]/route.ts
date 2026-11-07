import { NextResponse } from "next/server";
import { cancelInvoice, getInvoice } from "@/lib/billing";
import { jsonError, originFrom, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const invoice = getInvoice(id);
  if (!invoice) return jsonError("Invoice not found", 404);
  return NextResponse.json({ invoice, payUrl: `${originFrom(request)}/pay/${invoice.id}` });
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await readJson<{ action?: string }>(request);
    if (body.action !== "cancel") return jsonError("Unsupported action");
    return NextResponse.json({ invoice: cancelInvoice(id) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not update bill");
  }
}
