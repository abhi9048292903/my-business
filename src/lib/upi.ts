export function buildUpiUri(input: {
  vpa: string;
  payeeName: string;
  amountPaise: number;
  invoiceNumber: string;
}): string {
  const amount = (Math.max(0, input.amountPaise) / 100).toFixed(2);
  const note = input.invoiceNumber.replace(/[^A-Za-z0-9]/g, "").slice(0, 20) || "BILL";
  const params = new URLSearchParams({
    pa: input.vpa.trim(),
    pn: input.payeeName.trim().slice(0, 40) || "Merchant",
    am: amount,
    cu: "INR",
    tn: note,
    tr: note,
  });
  return `upi://pay?${params.toString()}`;
}

export function isValidVpa(vpa: string): boolean {
  return /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(vpa.trim());
}

export function isValidIndianMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile.trim());
}
