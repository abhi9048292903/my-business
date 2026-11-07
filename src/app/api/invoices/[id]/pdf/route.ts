import { getInvoice, getMerchant } from "@/lib/billing";
import { renderReceiptPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const merchant = getMerchant();
  const { id } = await ctx.params;
  const invoice = getInvoice(id);
  if (!merchant || !invoice) return new Response("Not found", { status: 404 });
  const bytes = await renderReceiptPdf(merchant, invoice);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
    },
  });
}
