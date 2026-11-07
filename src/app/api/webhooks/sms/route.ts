import { NextResponse } from "next/server";
import { assertWebhookSecret, reconcileSms } from "@/lib/billing";
import { jsonError, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** SMS forwarder / notification listener posts the raw UPI credit SMS here. */
export async function POST(request: Request) {
  try {
    assertWebhookSecret(request.headers.get("x-webhook-secret"));
    const body = await readJson<{ text?: string }>(request);
    if (!body.text?.trim()) return jsonError("text is required");
    return NextResponse.json(reconcileSms(body.text));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read SMS";
    return jsonError(message, message === "Invalid webhook secret" ? 401 : 400);
  }
}
