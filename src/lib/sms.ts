import { rupeesToPaise } from "./money";

export type ParsedSms = {
  amountPaise: number | null;
  invoiceNumber: string | null;
  utr: string | null;
};

export function parseUpiSms(text: string): ParsedSms {
  const amountMatch = text.match(/(?:inr|rs\.?|₹)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  const invoiceMatch = text.match(/\bINV\s*-?\s*(\d{3,})\b/i);
  const utrMatch = text.match(/\b(?:utr|upi\s*ref(?:erence)?|rrn)\s*[:\-]?\s*([A-Z0-9]{8,})\b/i);
  const looseUtr = text.match(/\b(\d{12})\b/);
  return {
    amountPaise: amountMatch ? rupeesToPaise(Number(amountMatch[1].replace(/,/g, ""))) : null,
    invoiceNumber: invoiceMatch ? `INV${invoiceMatch[1]}` : null,
    utr: utrMatch?.[1] || looseUtr?.[1] || null,
  };
}
