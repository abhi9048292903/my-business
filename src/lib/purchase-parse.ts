import { rupeesToPaise } from "./money";

export type ParsedPurchaseLine = {
  name: string;
  qty: number;
  unit: string;
  unitCostPaise: number;
};

export type ParsedPurchase = {
  supplierName: string | null;
  invoiceNo: string | null;
  lines: ParsedPurchaseLine[];
};

const UNIT = "kg|kgs|g|gm|ltr|litre|liter|l|ml|pcs|pc|pack|packet|pkt|piece|pieces|dozen";

function cleanName(value: string): string {
  return value.replace(/^[\d.)\-\s]+/, "").replace(/\s+/g, " ").trim();
}

function parsePurchaseLine(raw: string): ParsedPurchaseLine | null {
  const line = raw.trim();
  if (!line || /^(total|grand|gst|cgst|sgst|round|amount|subtotal)/i.test(line)) return null;
  const tail = new RegExp(
    `^(.+?)\\s+(\\d+(?:\\.\\d+)?)\\s*(${UNIT})?\\s*(?:@|x)?\\s*(?:rs\\.?|₹)?\\s*(\\d+(?:\\.\\d+)?)$`,
    "i",
  );
  const head = new RegExp(
    `^(\\d+(?:\\.\\d+)?)\\s*(${UNIT})?\\s+(.+?)\\s+(?:@|x)?\\s*(?:rs\\.?|₹)?\\s*(\\d+(?:\\.\\d+)?)$`,
    "i",
  );
  const first = line.match(tail);
  if (first) {
    const name = cleanName(first[1]);
    if (!name) return null;
    return {
      name,
      qty: Number(first[2]),
      unit: (first[3] || "pcs").toLowerCase(),
      unitCostPaise: rupeesToPaise(Number(first[4])),
    };
  }
  const second = line.match(head);
  if (!second) return null;
  return {
    name: cleanName(second[3]),
    qty: Number(second[1]),
    unit: (second[2] || "pcs").toLowerCase(),
    unitCostPaise: rupeesToPaise(Number(second[4])),
  };
}

export function parsePurchaseText(text: string): ParsedPurchase {
  const invoice = text.match(/(?:bill|invoice)\s*(?:no|number|#)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-\/]{1,})/i);
  const lines: ParsedPurchaseLine[] = [];
  let supplierName: string | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (invoice && trimmed.includes(invoice[0])) continue;
    const parsed = parsePurchaseLine(trimmed);
    if (parsed && parsed.qty > 0 && parsed.unitCostPaise >= 0) {
      lines.push(parsed);
      continue;
    }
    if (!supplierName && /[a-z]/i.test(trimmed) && trimmed.length < 60) supplierName = trimmed;
  }

  return {
    supplierName,
    invoiceNo: invoice?.[1] || null,
    lines,
  };
}

export const SAMPLE_PURCHASE_BILL = `Sharma Wholesale
Invoice No: SW-1044
Sugar 10 kg 44
Milk 24 L 49
Tea 5 pack 120
Toor Dal 8 kg 140`;
