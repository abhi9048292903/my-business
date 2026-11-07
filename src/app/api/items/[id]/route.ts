import { NextResponse } from "next/server";
import { archiveItem, updateItem } from "@/lib/billing";
import { jsonError, readJson } from "@/lib/http";
import { rupeesToPaise } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await readJson<{
      name?: string;
      barcode?: string;
      categoryId?: string | null;
      unit?: string;
      priceRupees?: number;
      gstRate?: number;
      stockQty?: number;
      lowStockQty?: number;
    }>(request);
    if (!body.name?.trim()) return jsonError("Item name is required");
    const item = updateItem(id, {
      name: body.name,
      barcode: body.barcode,
      categoryId: body.categoryId,
      unit: body.unit || "pcs",
      pricePaise: rupeesToPaise(Number(body.priceRupees) || 0),
      gstRate: Number(body.gstRate) || 0,
      stockQty: Number(body.stockQty) || 0,
      lowStockQty: Number(body.lowStockQty ?? 5),
    });
    return NextResponse.json({ item });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not update item");
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  archiveItem(id);
  return NextResponse.json({ ok: true });
}
