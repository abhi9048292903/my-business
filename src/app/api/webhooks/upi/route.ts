import { NextResponse } from "next/server";
import { assertWebhookSecret, markInvoicePaid } from "@/lib/billing";
import { jsonError, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bank or payment-provider webhook.
 * Header: x-webhook-secret
 * Body: { invoiceId, amountPaise, utr }
 * Amount must match the locked bill total.
 */
export async function POST(request: Request) {
  try {
    assertWebhookSecret(request.headers.get("x-webhook-secret"));
    const body = await readJson<{
      invoiceId?: string;
      invoiceNumber?: string;
      amountPaise?: number;
      utr?: string;
    }>(request);
    if (!body.invoiceId && !body.invoiceNumber) return jsonError("invoiceId is required");
    const result = markInvoicePaid({
      invoiceId: body.invoiceId,
      invoiceNumber: body.invoiceNumber,
      amountPaise: body.amountPaise,
      source: "UPI_WEBHOOK",
      utr: body.utr,
      payload: body,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook failed";
    const status = message === "Invalid webhook secret" ? 401 : message.includes("Amount") ? 409 : 400;
    return jsonError(message, status);
  }
}
