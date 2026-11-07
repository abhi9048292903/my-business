import { NextResponse } from "next/server";
import { createMerchant, getMerchant, updateMerchant } from "@/lib/billing";
import { jsonError, readJson } from "@/lib/http";
import { isValidIndianMobile, isValidVpa } from "@/lib/upi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const merchant = getMerchant();
  if (!merchant) return jsonError("Shop is not set up", 404);
  return NextResponse.json({ merchant });
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      businessName?: string;
      mobile?: string;
      upiVpa?: string;
      gstin?: string;
      address?: string;
      businessType?: string;
      sampleCatalog?: boolean;
    }>(request);
    if (!body.businessName?.trim()) return jsonError("Business name is required");
    if (!body.mobile || !isValidIndianMobile(body.mobile)) return jsonError("Enter a 10-digit mobile number");
    if (!body.upiVpa || !isValidVpa(body.upiVpa)) return jsonError("Enter a UPI ID like shop@okaxis");
    const merchant = createMerchant({
      businessName: body.businessName,
      mobile: body.mobile,
      upiVpa: body.upiVpa,
      gstin: body.gstin,
      address: body.address,
      businessType: body.businessType,
      sampleCatalog: body.sampleCatalog,
    });
    return NextResponse.json({ merchant }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not save shop");
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson<{
      businessName?: string;
      mobile?: string;
      upiVpa?: string;
      gstin?: string;
      address?: string;
      printerWidth?: string;
      businessType?: string;
    }>(request);
    if (body.mobile && !isValidIndianMobile(body.mobile)) return jsonError("Enter a 10-digit mobile number");
    if (body.upiVpa && !isValidVpa(body.upiVpa)) return jsonError("Enter a valid UPI ID");
    if (body.printerWidth && body.printerWidth !== "58" && body.printerWidth !== "80") {
      return jsonError("Printer width must be 58 or 80");
    }
    const merchant = updateMerchant({
      business_name: body.businessName?.trim(),
      mobile: body.mobile?.trim(),
      upi_vpa: body.upiVpa?.trim().toLowerCase(),
      gstin: body.gstin?.trim() || undefined,
      address: body.address?.trim(),
      printer_width: body.printerWidth,
      business_type: body.businessType?.trim(),
    });
    return NextResponse.json({ merchant });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not update shop");
  }
}
