import { NextResponse } from "next/server";
import { customerLedger, receiveKhataPayment } from "@/lib/billing";
import { jsonError, readJson } from "@/lib/http";
import { rupeesToPaise } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    return NextResponse.json(customerLedger(id));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Not found", 404);
  }
}

export async function POST(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await readJson<{ amountRupees?: number; note?: string }>(request);
    const ledger = receiveKhataPayment(id, rupeesToPaise(Number(body.amountRupees)), body.note);
    return NextResponse.json(ledger);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not record payment");
  }
}
