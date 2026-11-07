export type Shop = {
  id: string;
  business_name: string;
  mobile: string;
  upi_vpa: string;
  gstin: string | null;
  address: string | null;
  webhook_secret: string;
  printer_width: string;
  business_type?: string;
};

export type CatalogItem = {
  id: string;
  name: string;
  barcode: string | null;
  category_id: string | null;
  category_name?: string | null;
  unit: string;
  price_paise: number;
  gst_rate: number;
  stock_qty: number;
  low_stock_qty: number;
  track_stock?: number;
  item_type?: "product" | "service";
  skills?: string | null;
  service_type?: string | null;
};

export type Category = { id: string; name: string };

export type Party = {
  id: string;
  name: string;
  mobile: string | null;
  balance_paise: number;
};

export type BillLineView = {
  name: string;
  qty: number;
  unit?: string | null;
  line_total_paise: number;
  note?: string | null;
  gst_rate?: number;
};

export type BillView = {
  id: string;
  number: string;
  status: string;
  payment_mode: string;
  gst_mode: string;
  subtotal_paise: number;
  discount_paise: number;
  tax_paise: number;
  total_paise: number;
  upi_uri: string | null;
  customer_name?: string | null;
  notes?: string | null;
  created_at: string;
  utr?: string | null;
  local?: boolean;
  lines: BillLineView[];
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function rememberShop(shop: Shop) {
  localStorage.setItem("hisaab-merchant", JSON.stringify(shop));
  localStorage.setItem("hisaab-print", shop.printer_width || "58");
  document.documentElement.dataset.print = shop.printer_width || "58";
}

export function rememberedShop(): Shop | null {
  try {
    const raw = localStorage.getItem("hisaab-merchant");
    return raw ? (JSON.parse(raw) as Shop) : null;
  } catch {
    return null;
  }
}
