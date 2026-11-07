import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { InvoiceDetail } from "./billing";
import type { Merchant } from "./db";
import { formatINRPlain } from "./money";
import { qrModules } from "./qr";

export async function renderReceiptPdf(merchant: Merchant, invoice: InvoiceDetail): Promise<Uint8Array> {
  const width = merchant.printer_width === "80" ? 226 : 164;
  const height = 280 + invoice.lines.length * 28 + (invoice.gst_mode === "GST" ? 36 : 0);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([width, height]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = height - 18;
  const draw = (text: string, size = 9, heavy = false) => {
    page.drawText(text.slice(0, 42), { x: 8, y, size, font: heavy ? bold : font, color: rgb(0, 0, 0) });
    y -= size + 4;
  };

  draw(merchant.business_name, 12, true);
  if (merchant.address) draw(merchant.address, 8);
  if (merchant.gstin) draw(`GSTIN ${merchant.gstin}`, 8);
  draw(merchant.mobile, 8);
  y -= 4;
  draw(invoice.number, 11, true);
  draw(new Date(invoice.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), 8);
  if (invoice.customer_name) draw(invoice.customer_name, 9);
  draw(`${invoice.payment_mode} · ${invoice.status}`, 8);
  y -= 4;

  for (const line of invoice.lines) {
    draw(`${line.name}  x${line.qty} ${line.unit || ""}`.trim(), 8, true);
    draw(formatINRPlain(line.line_total_paise), 8);
    if (line.note) draw(line.note, 7);
  }

  y -= 4;
  draw(`Subtotal ${formatINRPlain(invoice.subtotal_paise)}`, 8);
  if (invoice.discount_paise) draw(`Discount ${formatINRPlain(invoice.discount_paise)}`, 8);
  if (invoice.gst_mode === "GST") {
    const half = Math.floor(invoice.tax_paise / 2);
    draw(`CGST ${formatINRPlain(half)}`, 8);
    draw(`SGST ${formatINRPlain(invoice.tax_paise - half)}`, 8);
  }
  draw(`TOTAL ${formatINRPlain(invoice.total_paise)}`, 12, true);

  if (invoice.upi_uri && invoice.status !== "CANCELLED") {
    y -= 8;
    const grid = qrModules(invoice.upi_uri);
    const size = Math.min(110, width - 24);
    const cell = size / grid.length;
    const originX = (width - size) / 2;
    const originY = y - size;
    grid.forEach((row, rowIndex) => {
      row.forEach((dark, colIndex) => {
        if (!dark) return;
        page.drawRectangle({
          x: originX + colIndex * cell,
          y: originY + (grid.length - 1 - rowIndex) * cell,
          width: cell,
          height: cell,
          color: rgb(0, 0, 0),
        });
      });
    });
  }

  return pdf.save();
}
