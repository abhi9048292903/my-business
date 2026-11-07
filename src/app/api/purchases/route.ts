import { NextResponse } from "next/server";
import { listItems, listPurchases, savePurchase, type PurchaseDraftLine } from "@/lib/billing";
import { jsonError, readJson } from "@/lib/http";
import { parsePurchaseText } from "@/lib/purchase-parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ purchases: listPurchases() });
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      action?: "parse" | "save";
      text?: string;
      supplierName?: string;
      invoiceNo?: string;
      sourceText?: string;
      lines?: PurchaseDraftLine[];
    }>(request);

    if (body.action === "parse") {
      if (!body.text?.trim()) return jsonError("No bill text to read");
      const parsed = parsePurchaseText(body.text);
      const items = listItems();
      const lines = parsed.lines.map((line) => {
        const item = items.find((candidate) => candidate.name.toLowerCase() === line.name.toLowerCase())
          || items.find((candidate) => candidate.name.toLowerCase().includes(line.name.toLowerCase()) || line.name.toLowerCase().includes(candidate.name.toLowerCase()));
        return { ...line, itemId: item?.id || null, itemName: item?.name || null, createNew: !item };
      });
      return NextResponse.json({ ...parsed, lines });
    }

    if (!body.lines?.length) return jsonError("Nothing to add to stock");
    const purchase = savePurchase({
      supplierName: body.supplierName,
      invoiceNo: body.invoiceNo,
      sourceText: body.sourceText,
      lines: body.lines,
    });
    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not save purchase");
  }
}
