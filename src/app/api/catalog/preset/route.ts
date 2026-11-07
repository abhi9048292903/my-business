import { NextResponse } from "next/server";
import { applyCatalogPreset, listCategories, listItems } from "@/lib/billing";
import { jsonError, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      businessType?: string;
      mode?: "replace" | "append";
    }>(request);

    if (!body.businessType) {
      return jsonError("Business type is required");
    }

    const stats = applyCatalogPreset(body.businessType, body.mode || "replace");
    return NextResponse.json({
      success: true,
      stats,
      items: listItems(),
      categories: listCategories(),
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not apply preset");
  }
}

