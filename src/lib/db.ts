import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const globalForDb = globalThis as unknown as { hisaabDb?: DatabaseSync };

function schemaSql(): string {
  return fs.readFileSync(path.join(process.cwd(), "src/lib/schema.sql"), "utf8");
}

export function getDb(): DatabaseSync {
  const file = process.env.HISAAB_DB || path.join(process.cwd(), "data", "hisaab.db");
  const current = globalForDb as unknown as { hisaabDb?: DatabaseSync; currentFile?: string };
  if (current.hisaabDb && current.currentFile === file) return current.hisaabDb;
  if (current.hisaabDb) {
    try {
      current.hisaabDb.close();
    } catch {}
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 4000;");
  db.exec(schemaSql());
  try {
    db.exec("ALTER TABLE merchant ADD COLUMN business_type TEXT NOT NULL DEFAULT 'retail';");
  } catch {
    /* column already exists */
  }
  try {
    db.exec("ALTER TABLE items ADD COLUMN item_type TEXT NOT NULL DEFAULT 'product';");
  } catch {
    /* column already exists */
  }
  try {
    db.exec("ALTER TABLE items ADD COLUMN skills TEXT;");
  } catch {
    /* column already exists */
  }
  try {
    db.exec("ALTER TABLE items ADD COLUMN service_type TEXT;");
  } catch {
    /* column already exists */
  }
  current.hisaabDb = db;
  current.currentFile = file;
  return db;
}

let inTransaction = false;

export function transaction<T>(fn: () => T): T {
  if (inTransaction) return fn();
  const db = getDb();
  inTransaction = true;
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* already rolled back */
    }
    throw error;
  } finally {
    inTransaction = false;
  }
}

export type Merchant = {
  id: string;
  business_name: string;
  mobile: string;
  upi_vpa: string;
  gstin: string | null;
  address: string | null;
  webhook_secret: string;
  printer_width: string;
  business_type: string;
  created_at: string;
};

export type Item = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category_id: string | null;
  category_name?: string | null;
  unit: string;
  price_paise: number;
  gst_rate: number;
  stock_qty: number;
  low_stock_qty: number;
  track_stock: number;
  item_type?: "product" | "service";
  skills?: string | null;
  service_type?: string | null;
  active: number;
  created_at: string;
};

export type Customer = {
  id: string;
  name: string;
  mobile: string | null;
  balance_paise: number;
  created_at: string;
};

export type Invoice = {
  id: string;
  client_id: string | null;
  seq: number;
  number: string;
  customer_id: string | null;
  customer_name: string | null;
  status: string;
  payment_mode: string;
  gst_mode: string;
  subtotal_paise: number;
  discount_paise: number;
  tax_paise: number;
  total_paise: number;
  bill_discount_percent: number;
  notes: string | null;
  upi_uri: string | null;
  utr: string | null;
  payment_source: string | null;
  paid_at: string | null;
  created_at: string;
};

export type InvoiceLine = {
  id: string;
  invoice_id: string;
  item_id: string | null;
  name: string;
  unit: string | null;
  qty: number;
  unit_price_paise: number;
  discount_percent: number;
  discount_paise: number;
  gst_rate: number;
  tax_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  line_total_paise: number;
  note: string | null;
};

export function one<T>(sql: string, ...params: Array<string | number | null>): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

export function many<T>(sql: string, ...params: Array<string | number | null>): T[] {
  return getDb().prepare(sql).all(...params) as unknown as T[];
}
