import { NextResponse } from "next/server";
import { createCustomer, listCustomers } from "@/lib/billing";
import { jsonError, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ customers: listCustomers() });
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{ name?: string; mobile?: string }>(request);
    if (!body.name?.trim()) return jsonError("Customer name is required");
    return NextResponse.json({ customer: createCustomer({ name: body.name, mobile: body.mobile }) }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not add customer");
  }
}
