import { NextResponse } from "next/server";
import { createItem, listCategories, listItems } from "@/lib/billing";
import { jsonError, readJson } from "@/lib/http";
import { rupeesToPaise } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ items: listItems(), categories: listCategories() });
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      name?: string;
      barcode?: string;
      categoryId?: string;
      unit?: string;
      priceRupees?: number;
      gstRate?: number;
      stockQty?: number;
      lowStockQty?: number;
    }>(request);
    if (!body.name?.trim()) return jsonError("Item name is required");
    const item = createItem({
      name: body.name,
      barcode: body.barcode,
      categoryId: body.categoryId,
      unit: body.unit || "pcs",
      pricePaise: rupeesToPaise(Number(body.priceRupees) || 0),
      gstRate: Number(body.gstRate) || 0,
      stockQty: Number(body.stockQty) || 0,
      lowStockQty: Number(body.lowStockQty ?? 5),
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not add item");
  }
}
