export type GstMode = "GST" | "NON_GST";

export type CartInputLine = {
  itemId?: string | null;
  name: string;
  unit?: string;
  qty: number;
  unitPricePaise: number;
  discountPercent?: number;
  gstRate?: number;
  note?: string;
};

export type PricedLine = CartInputLine & {
  grossPaise: number;
  discountPaise: number;
  lineTotalPaise: number;
  taxPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  basePaise: number;
  gstRate: number;
};

export type PricedBill = {
  lines: PricedLine[];
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  gstMode: GstMode;
  billDiscountPercent: number;
};

function clampPercent(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value as number));
}

/** Prices are tax-inclusive. GST mode extracts CGST + SGST from the line total. */
export function priceBill(
  lines: CartInputLine[],
  opts: { gstMode: GstMode; billDiscountPercent?: number },
): PricedBill {
  const billDiscountPercent = clampPercent(opts.billDiscountPercent);
  const gstOn = opts.gstMode === "GST";

  const priced: PricedLine[] = lines.map((line) => {
    const qty = Number(line.qty);
    const unitPricePaise = Math.round(Number(line.unitPricePaise));
    const grossPaise = Math.max(0, Math.round(qty * unitPricePaise));
    const lineDiscount = clampPercent(line.discountPercent);
    const afterLine = grossPaise - Math.round(grossPaise * (lineDiscount / 100));
    const lineTotalPaise = Math.max(0, Math.round(afterLine * (1 - billDiscountPercent / 100)));
    const rate = gstOn ? Math.max(0, Number(line.gstRate) || 0) : 0;
    const taxPaise = rate > 0 ? Math.round((lineTotalPaise * rate) / (100 + rate)) : 0;
    const cgstPaise = Math.floor(taxPaise / 2);
    const sgstPaise = taxPaise - cgstPaise;
    return {
      ...line,
      qty,
      unitPricePaise,
      discountPercent: lineDiscount,
      grossPaise,
      discountPaise: grossPaise - lineTotalPaise,
      lineTotalPaise,
      taxPaise,
      cgstPaise,
      sgstPaise,
      basePaise: lineTotalPaise - taxPaise,
      gstRate: rate,
      note: line.note?.trim() || "",
      name: line.name.trim(),
      unit: line.unit || "pcs",
    };
  });

  const subtotalPaise = priced.reduce((sum, line) => sum + line.grossPaise, 0);
  const totalPaise = priced.reduce((sum, line) => sum + line.lineTotalPaise, 0);
  const taxPaise = priced.reduce((sum, line) => sum + line.taxPaise, 0);
  return {
    lines: priced,
    subtotalPaise,
    discountPaise: subtotalPaise - totalPaise,
    taxPaise,
    totalPaise,
    gstMode: opts.gstMode,
    billDiscountPercent,
  };
}
