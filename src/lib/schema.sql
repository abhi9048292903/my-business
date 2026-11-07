-- Hisaab ledger. Money is stored in paise (integer). Qty may be fractional.

CREATE TABLE IF NOT EXISTS merchant (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  upi_vpa TEXT NOT NULL,
  gstin TEXT,
  address TEXT,
  webhook_secret TEXT NOT NULL,
  printer_width TEXT NOT NULL DEFAULT '58',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  category_id TEXT REFERENCES categories(id),
  unit TEXT NOT NULL DEFAULT 'pcs',
  price_paise INTEGER NOT NULL,
  gst_rate REAL NOT NULL DEFAULT 0,
  stock_qty REAL NOT NULL DEFAULT 0,
  low_stock_qty REAL NOT NULL DEFAULT 5,
  track_stock INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT,
  balance_paise INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  client_id TEXT UNIQUE,
  seq INTEGER NOT NULL UNIQUE,
  number TEXT NOT NULL UNIQUE,
  customer_id TEXT REFERENCES customers(id),
  customer_name TEXT,
  status TEXT NOT NULL,
  payment_mode TEXT NOT NULL,
  gst_mode TEXT NOT NULL,
  subtotal_paise INTEGER NOT NULL,
  discount_paise INTEGER NOT NULL,
  tax_paise INTEGER NOT NULL,
  total_paise INTEGER NOT NULL,
  bill_discount_percent REAL NOT NULL DEFAULT 0,
  notes TEXT,
  upi_uri TEXT,
  utr TEXT,
  payment_source TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  item_id TEXT,
  name TEXT NOT NULL,
  unit TEXT,
  qty REAL NOT NULL,
  unit_price_paise INTEGER NOT NULL,
  discount_percent REAL NOT NULL DEFAULT 0,
  discount_paise INTEGER NOT NULL,
  gst_rate REAL NOT NULL,
  tax_paise INTEGER NOT NULL,
  cgst_paise INTEGER NOT NULL,
  sgst_paise INTEGER NOT NULL,
  line_total_paise INTEGER NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id),
  qty_delta REAL NOT NULL,
  reason TEXT NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  invoice_id TEXT,
  amount_paise INTEGER NOT NULL,
  entry_type TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  supplier_name TEXT,
  invoice_no TEXT,
  total_paise INTEGER NOT NULL,
  source_text TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_lines (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id),
  item_id TEXT,
  name TEXT NOT NULL,
  qty REAL NOT NULL,
  unit_cost_paise INTEGER NOT NULL,
  line_total_paise INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  source TEXT NOT NULL,
  payload TEXT NOT NULL,
  outcome TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_customer ON ledger_entries(customer_id);
