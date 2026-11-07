import { formatINRPlain } from "./money";

export function whatsAppHref(input: {
  mobile: string | null | undefined;
  businessName: string;
  invoiceNumber: string;
  totalPaise: number;
  payUrl: string;
}): string {
  const digits = (input.mobile || "").replace(/\D/g, "");
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const text = [
    `*${input.businessName}*`,
    `Invoice ${input.invoiceNumber}`,
    `Amount: ${formatINRPlain(input.totalPaise)}`,
    "Pay with GPay, PhonePe, Paytm or BHIM:",
    input.payUrl,
  ].join("\n");
  const base = phone ? `https://wa.me/${phone}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function smsHref(input: {
  mobile: string | null | undefined;
  businessName: string;
  invoiceNumber: string;
  totalPaise: number;
  payUrl: string;
}): string {
  const body = `${input.businessName} bill ${input.invoiceNumber}: ${formatINRPlain(input.totalPaise)}. Pay: ${input.payUrl}`;
  const digits = (input.mobile || "").replace(/\D/g, "");
  return `sms:${digits}?&body=${encodeURIComponent(body)}`;
}

/** Shape posted to WhatsApp Cloud API when WHATSAPP_TOKEN and WHATSAPP_PHONE_ID are set. */
export function whatsAppCloudPayload(input: {
  mobile: string;
  businessName: string;
  invoiceNumber: string;
  totalPaise: number;
  payUrl: string;
}) {
  const digits = input.mobile.replace(/\D/g, "");
  const to = digits.length === 10 ? `91${digits}` : digits;
  return {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "cta_url",
      body: {
        text: `${input.businessName}\nInvoice ${input.invoiceNumber}\n${formatINRPlain(input.totalPaise)}`,
      },
      action: {
        name: "cta_url",
        parameters: {
          display_text: "Pay with UPI",
          url: input.payUrl,
        },
      },
    },
  };
}
