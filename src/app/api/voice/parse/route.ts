import { NextResponse } from "next/server";
import { listCustomers, listItems } from "@/lib/billing";
import { jsonError, readJson } from "@/lib/http";
import { matchVoiceLine, parseVoiceBill } from "@/lib/voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ transcript?: string }>(request);
    if (!body.transcript?.trim()) return jsonError("Say the items first");
    const parsed = parseVoiceBill(body.transcript);
    const items = listItems();
    const customers = listCustomers();
    const matched = parsed.lines.map((line) => {
      const hit = matchVoiceLine(line, items);
      return {
        ...line,
        item: hit
          ? {
              id: hit.item.id,
              name: hit.item.name,
              unit: hit.item.unit,
              pricePaise: items.find((item) => item.id === hit.item.id)?.price_paise,
              gstRate: items.find((item) => item.id === hit.item.id)?.gst_rate,
            }
          : null,
      };
    });
    const customer = parsed.customerQuery
      ? customers.find((entry) => entry.name.toLowerCase().includes(parsed.customerQuery!.toLowerCase())) || null
      : null;
    return NextResponse.json({ parsed, matched, customer });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not understand that");
  }
}
