import { randomBytes, randomUUID } from "node:crypto";
import {
  getDb,
  many,
  one,
  transaction,
  type Customer,
  type Invoice,
  type InvoiceLine,
  type Item,
  type Merchant,
} from "./db";
import { startOfTodayISO } from "./money";
import { priceBill, type CartInputLine, type GstMode } from "./pricing";
import { getCatalogPreset, seedPrice } from "./seed";
import { parseUpiSms } from "./sms";
import { buildUpiUri } from "./upi";
import { publishInvoice } from "./realtime";

export type PublicMerchant = Merchant;

export function getMerchant(): Merchant | undefined {
  return one<Merchant>("SELECT * FROM merchant LIMIT 1");
}

export function createMerchant(input: {
  businessName: string;
  mobile: string;
  upiVpa: string;
  gstin?: string;
  address?: string;
  businessType?: string;
  sampleCatalog?: boolean;
}): Merchant {
  if (getMerchant()) throw new Error("This device already has a shop profile");
  const now = new Date().toISOString();
  const businessType = input.businessType?.trim() || "retail";
  const merchant: Merchant = {
    id: randomUUID(),
    business_name: input.businessName.trim(),
    mobile: input.mobile.trim(),
    upi_vpa: input.upiVpa.trim().toLowerCase(),
    gstin: input.gstin?.trim() || null,
    address: input.address?.trim() || null,
    webhook_secret: randomBytes(16).toString("hex"),
    printer_width: "58",
    business_type: businessType,
    created_at: now,
  };

  transaction(() => {
    getDb()
      .prepare(
        `INSERT INTO merchant (id, business_name, mobile, upi_vpa, gstin, address, webhook_secret, printer_width, business_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        merchant.id,
        merchant.business_name,
        merchant.mobile,
        merchant.upi_vpa,
        merchant.gstin,
        merchant.address,
        merchant.webhook_secret,
        merchant.printer_width,
        merchant.business_type,
        merchant.created_at,
      );

    if (input.sampleCatalog !== false) {
      applyCatalogPreset(businessType, "replace");

      const ramesh = randomUUID();
      const sunita = randomUUID();
      const insertCustomer = getDb().prepare(
        "INSERT INTO customers (id, name, mobile, balance_paise, created_at) VALUES (?, ?, ?, ?, ?)",
      );
      if (businessType === "freelance" || businessType === "staffing") {
        insertCustomer.run(ramesh, "Acme Tech Ventures", "9845011122", 0, now);
        insertCustomer.run(sunita, "Nova Cloud Solutions", "9845033344", 5000000, now);
        getDb()
          .prepare(
            `INSERT INTO ledger_entries (id, customer_id, invoice_id, amount_paise, entry_type, note, created_at)
             VALUES (?, ?, NULL, ?, 'OPENING', ?, ?)`,
          )
          .run(randomUUID(), sunita, 5000000, "Opening balance (retainer invoice)", now);
      } else {
        insertCustomer.run(ramesh, "Ramesh Kumar", "9845011122", 0, now);
        insertCustomer.run(sunita, "Sunita Devi", "9845033344", 25000, now);
        getDb()
          .prepare(
            `INSERT INTO ledger_entries (id, customer_id, invoice_id, amount_paise, entry_type, note, created_at)
             VALUES (?, ?, NULL, ?, 'OPENING', ?, ?)`,
          )
          .run(randomUUID(), sunita, 25000, "Opening udhar", now);
      }
    }
  });

  return merchant;
}

export function applyCatalogPreset(businessType: string, mode: "replace" | "append" = "replace"): { itemsCount: number; categoriesCount: number } {
  const { categories, items } = getCatalogPreset(businessType);
  const now = new Date().toISOString();

  return transaction(() => {
    if (mode === "replace") {
      getDb().exec("DELETE FROM items");
      getDb().exec("DELETE FROM categories");
    }

    const insertCategory = getDb().prepare(
      "INSERT OR IGNORE INTO categories (id, name, sort_order) VALUES (?, ?, ?)",
    );
    for (const category of categories) {
      insertCategory.run(category.id, category.name, category.sort_order);
    }

    const insertItem = getDb().prepare(
      `INSERT OR REPLACE INTO items (
        id, name, sku, barcode, category_id, unit, price_paise, gst_rate,
        stock_qty, low_stock_qty, track_stock, item_type, skills, service_type, active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    );

    for (const item of items) {
      const isService = item.itemType === "service";
      const trackStock = isService ? 0 : (item.trackStock ?? 1);
      const stockQty = isService ? 0 : (item.stock ?? 0);
      const lowStockQty = isService ? 0 : (item.low ?? 0);
      insertItem.run(
        item.id,
        item.name,
        item.barcode ? item.barcode.slice(-4) : null,
        item.barcode || null,
        item.categoryId,
        item.unit,
        seedPrice(item.price),
        item.gst,
        stockQty,
        lowStockQty,
        trackStock,
        item.itemType || "product",
        item.skills || null,
        item.serviceType || null,
        now,
      );
    }

    return { itemsCount: items.length, categoriesCount: categories.length };
  });
}

export function updateMerchant(patch: Partial<Pick<Merchant, "business_name" | "mobile" | "upi_vpa" | "gstin" | "address" | "printer_width" | "business_type">>): Merchant {
  const current = getMerchant();
  if (!current) throw new Error("Set up the shop first");
  const next = {
    ...current,
    ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
  };
  getDb()
    .prepare(
      `UPDATE merchant SET business_name = ?, mobile = ?, upi_vpa = ?, gstin = ?, address = ?, printer_width = ?, business_type = ? WHERE id = ?`,
    )
    .run(next.business_name, next.mobile, next.upi_vpa, next.gstin, next.address, next.printer_width, next.business_type || "retail", current.id);
  return getMerchant() as Merchant;
}

export function listCategories() {
  return many<{ id: string; name: string; sort_order: number }>("SELECT * FROM categories ORDER BY sort_order");
}

export function listItems(): Item[] {
  return many<Item>(
    `SELECT items.*, categories.name AS category_name
     FROM items
     LEFT JOIN categories ON categories.id = items.category_id
     WHERE items.active = 1
     ORDER BY items.name`,
  );
}

export function createItem(input: {
  name: string;
  barcode?: string;
  categoryId?: string;
  unit: string;
  pricePaise: number;
  gstRate: number;
  stockQty?: number;
  lowStockQty?: number;
  trackStock?: number;
  itemType?: "product" | "service";
  skills?: string;
  serviceType?: string;
}): Item {
  const id = randomUUID();
  const now = new Date().toISOString();
  const itemType = input.itemType || "product";
  const isService = itemType === "service";
  const trackStock = isService ? 0 : (input.trackStock ?? 1);
  const stockQty = isService ? 0 : (input.stockQty || 0);
  const lowStockQty = isService ? 0 : (input.lowStockQty ?? 5);

  getDb()
    .prepare(
      `INSERT INTO items (id, name, sku, barcode, category_id, unit, price_paise, gst_rate, stock_qty, low_stock_qty, track_stock, item_type, skills, service_type, active, created_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    )
    .run(
      id,
      input.name.trim(),
      input.barcode?.trim() || null,
      input.categoryId || null,
      input.unit,
      Math.round(input.pricePaise),
      input.gstRate,
      stockQty,
      lowStockQty,
      trackStock,
      itemType,
      input.skills?.trim() || null,
      input.serviceType?.trim() || null,
      now,
    );
  return one<Item>("SELECT items.*, categories.name AS category_name FROM items LEFT JOIN categories ON categories.id = items.category_id WHERE items.id = ?", id) as Item;
}

export function updateItem(id: string, input: {
  name: string;
  barcode?: string;
  categoryId?: string | null;
  unit: string;
  pricePaise: number;
  gstRate: number;
  lowStockQty?: number;
  stockQty?: number;
  trackStock?: number;
  itemType?: "product" | "service";
  skills?: string | null;
  serviceType?: string | null;
}) {
  const existing = one<Item>("SELECT * FROM items WHERE id = ? AND active = 1", id);
  if (!existing) throw new Error("Item not found");
  const itemType = input.itemType || existing.item_type || "product";
  const isService = itemType === "service";
  const trackStock = isService ? 0 : (input.trackStock ?? existing.track_stock ?? 1);
  const stockQty = isService ? 0 : (input.stockQty ?? existing.stock_qty);
  const lowStockQty = isService ? 0 : (input.lowStockQty ?? existing.low_stock_qty);

  transaction(() => {
    getDb()
      .prepare(
        `UPDATE items SET name = ?, barcode = ?, category_id = ?, unit = ?, price_paise = ?, gst_rate = ?, low_stock_qty = ?, stock_qty = ?, track_stock = ?, item_type = ?, skills = ?, service_type = ? WHERE id = ?`,
      )
      .run(
        input.name.trim(),
        input.barcode?.trim() || null,
        input.categoryId || null,
        input.unit,
        Math.round(input.pricePaise),
        input.gstRate,
        lowStockQty,
        stockQty,
        trackStock,
        itemType,
        input.skills !== undefined ? (input.skills?.trim() || null) : (existing.skills || null),
        input.serviceType !== undefined ? (input.serviceType?.trim() || null) : (existing.service_type || null),
        id,
      );
    if (trackStock === 1) {
      const delta = stockQty - existing.stock_qty;
      if (Math.abs(delta) > 0.0001) {
        getDb()
          .prepare(
            `INSERT INTO stock_movements (id, item_id, qty_delta, reason, ref_type, ref_id, created_at) VALUES (?, ?, ?, 'ADJUST', 'item', ?, ?)`,
          )
          .run(randomUUID(), id, delta, id, new Date().toISOString());
      }
    }
  });
  return one<Item>("SELECT items.*, categories.name AS category_name FROM items LEFT JOIN categories ON categories.id = items.category_id WHERE items.id = ?", id) as Item;
}

export function archiveItem(id: string) {
  getDb().prepare("UPDATE items SET active = 0 WHERE id = ?").run(id);
}

export type CreateInvoiceInput = {
  lines: CartInputLine[];
  gstMode: GstMode;
  billDiscountPercent?: number;
  paymentMode: "UPI" | "CASH" | "CREDIT";
  customerId?: string | null;
  notes?: string;
  clientId?: string | null;
};

export type InvoiceDetail = Invoice & { lines: InvoiceLine[] };

function hydrate(invoice: Invoice): InvoiceDetail {
  return {
    ...invoice,
    lines: many<InvoiceLine>("SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY name", invoice.id),
  };
}

export function getInvoice(id: string): InvoiceDetail | undefined {
  const invoice = one<Invoice>("SELECT * FROM invoices WHERE id = ?", id);
  if (!invoice) return undefined;
  return hydrate(invoice);
}

export function getInvoiceByClient(clientId: string): InvoiceDetail | undefined {
  const invoice = one<Invoice>("SELECT * FROM invoices WHERE client_id = ?", clientId);
  if (!invoice) return undefined;
  return hydrate(invoice);
}

export function listInvoices(status?: string): Invoice[] {
  if (status) return many<Invoice>("SELECT * FROM invoices WHERE status = ? ORDER BY created_at DESC LIMIT 200", status);
  return many<Invoice>("SELECT * FROM invoices ORDER BY created_at DESC LIMIT 200");
}

function nextSeq(): number {
  const row = one<{ seq: number }>("SELECT COALESCE(MAX(seq), 1000) AS seq FROM invoices");
  return (row?.seq || 1000) + 1;
}

export function createInvoice(input: CreateInvoiceInput): InvoiceDetail {
  const merchant = getMerchant();
  if (!merchant) throw new Error("Set up the shop first");
  if (!input.lines.length) throw new Error("Add at least one item");
  if (input.clientId) {
    const existing = getInvoiceByClient(input.clientId);
    if (existing) return existing;
  }
  if (input.paymentMode === "CREDIT" && !input.customerId) throw new Error("Choose a customer for udhar");

  for (const line of input.lines) {
    if (!line.name?.trim()) throw new Error("Each line needs a name");
    if (!(line.qty > 0) || line.qty > 100000) throw new Error("Quantity looks wrong");
    if (!Number.isFinite(line.unitPricePaise) || line.unitPricePaise < 0) throw new Error("Price looks wrong");
  }

  const priced = priceBill(input.lines, {
    gstMode: input.gstMode,
    billDiscountPercent: input.billDiscountPercent,
  });
  if (priced.totalPaise <= 0) throw new Error("Bill total must be more than zero");

  const customer = input.customerId
    ? one<Customer>("SELECT * FROM customers WHERE id = ?", input.customerId)
    : undefined;
  if (input.customerId && !customer) throw new Error("Customer not found");

  const now = new Date().toISOString();
  const id = randomUUID();
  const status = input.paymentMode === "CASH" ? "PAID" : input.paymentMode === "CREDIT" ? "CREDIT" : "UNPAID";

  transaction(() => {
    const seq = nextSeq();
    const number = `INV${seq}`;
    const lockedUri = buildUpiUri({
      vpa: merchant.upi_vpa,
      payeeName: merchant.business_name,
      amountPaise: priced.totalPaise,
      invoiceNumber: number,
    });
    getDb()
      .prepare(
        `INSERT INTO invoices (
          id, client_id, seq, number, customer_id, customer_name, status, payment_mode, gst_mode,
          subtotal_paise, discount_paise, tax_paise, total_paise, bill_discount_percent, notes,
          upi_uri, utr, payment_source, paid_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      )
      .run(
        id,
        input.clientId || null,
        seq,
        number,
        customer?.id || null,
        customer?.name || null,
        status,
        input.paymentMode,
        input.gstMode,
        priced.subtotalPaise,
        priced.discountPaise,
        priced.taxPaise,
        priced.totalPaise,
        priced.billDiscountPercent,
        input.notes?.trim() || null,
        lockedUri,
        status === "PAID" ? "CASH" : null,
        status === "PAID" ? now : null,
        now,
      );

    const insertLine = getDb().prepare(
      `INSERT INTO invoice_lines (
        id, invoice_id, item_id, name, unit, qty, unit_price_paise, discount_percent, discount_paise,
        gst_rate, tax_paise, cgst_paise, sgst_paise, line_total_paise, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const moveStock = getDb().prepare(
      `INSERT INTO stock_movements (id, item_id, qty_delta, reason, ref_type, ref_id, created_at) VALUES (?, ?, ?, 'SALE', 'invoice', ?, ?)`,
    );
    const decrement = getDb().prepare("UPDATE items SET stock_qty = stock_qty - ? WHERE id = ? AND track_stock = 1");

    for (const line of priced.lines) {
      insertLine.run(
        randomUUID(),
        id,
        line.itemId || null,
        line.name,
        line.unit || "pcs",
        line.qty,
        line.unitPricePaise,
        line.discountPercent || 0,
        line.discountPaise,
        line.gstRate,
        line.taxPaise,
        line.cgstPaise,
        line.sgstPaise,
        line.lineTotalPaise,
        line.note || null,
      );
      if (line.itemId) {
        const item = one<Item>("SELECT * FROM items WHERE id = ?", line.itemId);
        if (item && item.track_stock === 1) {
          decrement.run(line.qty, line.itemId);
          moveStock.run(randomUUID(), line.itemId, -line.qty, id, now);
        }
      }
    }

    if (input.paymentMode === "CREDIT" && customer) {
      getDb()
        .prepare(
          `INSERT INTO ledger_entries (id, customer_id, invoice_id, amount_paise, entry_type, note, created_at)
           VALUES (?, ?, ?, ?, 'CREDIT_SALE', ?, ?)`,
        )
        .run(randomUUID(), customer.id, id, priced.totalPaise, number, now);
      getDb().prepare("UPDATE customers SET balance_paise = balance_paise + ? WHERE id = ?").run(priced.totalPaise, customer.id);
    }
  });

  return getInvoice(id) as InvoiceDetail;
}

export function markInvoicePaid(input: {
  invoiceId?: string;
  invoiceNumber?: string;
  amountPaise?: number | null;
  source: string;
  utr?: string | null;
  payload?: unknown;
}): { invoice: InvoiceDetail; already: boolean } {
  const invoice = input.invoiceId
    ? one<Invoice>("SELECT * FROM invoices WHERE id = ?", input.invoiceId)
    : input.invoiceNumber
      ? one<Invoice>("SELECT * FROM invoices WHERE number = ?", input.invoiceNumber)
      : undefined;
  if (!invoice) {
    logPayment(null, input.source, input.payload ?? input, "NOT_FOUND");
    throw new Error("Invoice not found");
  }
  if (invoice.status === "PAID") {
    logPayment(invoice.id, input.source, input.payload ?? input, "ALREADY_PAID");
    return { invoice: hydrate(invoice), already: true };
  }
  if (invoice.status !== "UNPAID") {
    logPayment(invoice.id, input.source, input.payload ?? input, "NOT_PAYABLE");
    throw new Error(`Invoice is ${invoice.status}`);
  }
  if (input.amountPaise != null && input.amountPaise !== invoice.total_paise) {
    logPayment(invoice.id, input.source, input.payload ?? input, "AMOUNT_MISMATCH");
    throw new Error("Amount does not match this bill");
  }

  const now = new Date().toISOString();
  transaction(() => {
    getDb()
      .prepare("UPDATE invoices SET status = 'PAID', paid_at = ?, utr = ?, payment_source = ? WHERE id = ? AND status = 'UNPAID'")
      .run(now, input.utr || null, input.source, invoice.id);
  });
  logPayment(invoice.id, input.source, input.payload ?? input, "PAID");
  const fresh = getInvoice(invoice.id) as InvoiceDetail;
  publishInvoice(invoice.id, { status: "PAID", invoice: fresh, spoken: paymentSpeech(fresh) });
  return { invoice: fresh, already: false };
}

export function paymentSpeech(invoice: Invoice): string {
  const rupees = (invoice.total_paise / 100).toFixed(invoice.total_paise % 100 === 0 ? 0 : 2);
  return `Payment of ₹${rupees} received successfully via UPI`;
}

function logPayment(invoiceId: string | null, source: string, payload: unknown, outcome: string) {
  getDb()
    .prepare(
      `INSERT INTO payment_events (id, invoice_id, source, payload, outcome, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), invoiceId, source, JSON.stringify(payload ?? {}), outcome, new Date().toISOString());
}

export function reconcileSms(text: string): { matched: boolean; reason: string; invoice?: InvoiceDetail; already?: boolean } {
  const parsed = parseUpiSms(text);
  logPayment(null, "SMS", { text, parsed }, "RECEIVED");
  if (parsed.invoiceNumber) {
    try {
      const result = markInvoicePaid({
        invoiceNumber: parsed.invoiceNumber,
        amountPaise: parsed.amountPaise,
        source: "SMS",
        utr: parsed.utr,
        payload: { text, parsed },
      });
      return { matched: true, reason: "invoice number", invoice: result.invoice, already: result.already };
    } catch (error) {
      return { matched: false, reason: error instanceof Error ? error.message : "No match" };
    }
  }
  if (parsed.amountPaise == null) return { matched: false, reason: "No amount in the message" };
  const candidates = many<Invoice>(
    "SELECT * FROM invoices WHERE status = 'UNPAID' AND total_paise = ? ORDER BY created_at DESC",
    parsed.amountPaise,
  );
  if (candidates.length === 1) {
    const result = markInvoicePaid({
      invoiceId: candidates[0].id,
      amountPaise: parsed.amountPaise,
      source: "SMS",
      utr: parsed.utr,
      payload: { text, parsed },
    });
    return { matched: true, reason: "unique amount", invoice: result.invoice, already: result.already };
  }
  if (candidates.length === 0) return { matched: false, reason: "No unpaid bill for that amount" };
  return { matched: false, reason: "Several unpaid bills share that amount" };
}

export function cancelInvoice(id: string): InvoiceDetail {
  const invoice = getInvoice(id);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "CANCELLED") return invoice;
  const now = new Date().toISOString();
  transaction(() => {
    getDb().prepare("UPDATE invoices SET status = 'CANCELLED' WHERE id = ?").run(id);
    const restock = getDb().prepare("UPDATE items SET stock_qty = stock_qty + ? WHERE id = ? AND track_stock = 1");
    const movement = getDb().prepare(
      `INSERT INTO stock_movements (id, item_id, qty_delta, reason, ref_type, ref_id, created_at) VALUES (?, ?, ?, 'CANCEL', 'invoice', ?, ?)`,
    );
    for (const line of invoice.lines) {
      if (!line.item_id) continue;
      const item = one<Item>("SELECT * FROM items WHERE id = ?", line.item_id);
      if (item && item.track_stock === 1) {
        restock.run(line.qty, line.item_id);
        movement.run(randomUUID(), line.item_id, line.qty, id, now);
      }
    }
    if (invoice.payment_mode === "CREDIT" && invoice.customer_id) {
      getDb()
        .prepare(
          `INSERT INTO ledger_entries (id, customer_id, invoice_id, amount_paise, entry_type, note, created_at)
           VALUES (?, ?, ?, ?, 'ADJUSTMENT', ?, ?)`,
        )
        .run(randomUUID(), invoice.customer_id, id, -invoice.total_paise, `Cancelled ${invoice.number}`, now);
      getDb()
        .prepare("UPDATE customers SET balance_paise = balance_paise - ? WHERE id = ?")
        .run(invoice.total_paise, invoice.customer_id);
    }
  });
  const fresh = getInvoice(id) as InvoiceDetail;
  publishInvoice(id, { status: "CANCELLED", invoice: fresh });
  return fresh;
}

export function listCustomers(): Customer[] {
  return many<Customer>("SELECT * FROM customers ORDER BY name");
}

export function createCustomer(input: { name: string; mobile?: string }): Customer {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare("INSERT INTO customers (id, name, mobile, balance_paise, created_at) VALUES (?, ?, ?, 0, ?)")
    .run(id, input.name.trim(), input.mobile?.trim() || null, now);
  return one<Customer>("SELECT * FROM customers WHERE id = ?", id) as Customer;
}

export function customerLedger(customerId: string) {
  const customer = one<Customer>("SELECT * FROM customers WHERE id = ?", customerId);
  if (!customer) throw new Error("Customer not found");
  const entries = many<{
    id: string;
    customer_id: string;
    invoice_id: string | null;
    amount_paise: number;
    entry_type: string;
    note: string | null;
    created_at: string;
  }>("SELECT * FROM ledger_entries WHERE customer_id = ? ORDER BY created_at DESC", customerId);
  return { customer, entries };
}

export function receiveKhataPayment(customerId: string, amountPaise: number, note?: string) {
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) throw new Error("Enter an amount");
  const customer = one<Customer>("SELECT * FROM customers WHERE id = ?", customerId);
  if (!customer) throw new Error("Customer not found");
  const now = new Date().toISOString();
  transaction(() => {
    getDb()
      .prepare(
        `INSERT INTO ledger_entries (id, customer_id, invoice_id, amount_paise, entry_type, note, created_at)
         VALUES (?, ?, NULL, ?, 'RECEIPT', ?, ?)`,
      )
      .run(randomUUID(), customerId, -Math.round(amountPaise), note?.trim() || "Payment received", now);
    getDb().prepare("UPDATE customers SET balance_paise = balance_paise - ? WHERE id = ?").run(Math.round(amountPaise), customerId);
  });
  return customerLedger(customerId);
}

export function todayReport() {
  const start = startOfTodayISO();
  const bills = many<Invoice>(
    "SELECT * FROM invoices WHERE created_at >= ? AND status != 'CANCELLED'",
    start,
  );
  const lowStock = many<Item>(
    "SELECT * FROM items WHERE active = 1 AND track_stock = 1 AND stock_qty <= low_stock_qty ORDER BY stock_qty ASC",
  );
  const outstanding = one<{ total: number }>("SELECT COALESCE(SUM(balance_paise), 0) AS total FROM customers");
  return {
    billCount: bills.length,
    billedPaise: bills.reduce((sum, bill) => sum + bill.total_paise, 0),
    collectedPaise: bills.filter((bill) => bill.status === "PAID").reduce((sum, bill) => sum + bill.total_paise, 0),
    creditPaise: bills.filter((bill) => bill.status === "CREDIT").reduce((sum, bill) => sum + bill.total_paise, 0),
    unpaidCount: bills.filter((bill) => bill.status === "UNPAID").length,
    lowStock,
    outstandingPaise: outstanding?.total || 0,
  };
}

export type PurchaseDraftLine = {
  name: string;
  qty: number;
  unitCostPaise: number;
  itemId?: string | null;
  createNew?: boolean;
  sellingPricePaise?: number;
  unit?: string;
};

export function savePurchase(input: {
  supplierName?: string;
  invoiceNo?: string;
  sourceText?: string;
  lines: PurchaseDraftLine[];
}) {
  if (!input.lines.length) throw new Error("No purchase lines");
  const now = new Date().toISOString();
  const id = randomUUID();
  const total = input.lines.reduce((sum, line) => sum + Math.round(line.qty * line.unitCostPaise), 0);
  transaction(() => {
    getDb()
      .prepare(
        `INSERT INTO purchases (id, supplier_name, invoice_no, total_paise, source_text, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.supplierName?.trim() || null, input.invoiceNo?.trim() || null, total, input.sourceText || null, now);
    const insertLine = getDb().prepare(
      `INSERT INTO purchase_lines (id, purchase_id, item_id, name, qty, unit_cost_paise, line_total_paise) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const bump = getDb().prepare("UPDATE items SET stock_qty = stock_qty + ? WHERE id = ?");
    const movement = getDb().prepare(
      `INSERT INTO stock_movements (id, item_id, qty_delta, reason, ref_type, ref_id, created_at) VALUES (?, ?, ?, 'PURCHASE', 'purchase', ?, ?)`,
    );
    for (const line of input.lines) {
      if (!(line.qty > 0)) throw new Error("Purchase quantity must be positive");
      let itemId = line.itemId || null;
      if (!itemId && line.createNew) {
        const created = createItem({
          name: line.name,
          unit: line.unit || "pcs",
          pricePaise: line.sellingPricePaise ?? line.unitCostPaise,
          gstRate: 0,
          stockQty: 0,
          lowStockQty: 5,
        });
        itemId = created.id;
      }
      const lineTotal = Math.round(line.qty * line.unitCostPaise);
      insertLine.run(randomUUID(), id, itemId, line.name.trim(), line.qty, Math.round(line.unitCostPaise), lineTotal);
      if (itemId) {
        bump.run(line.qty, itemId);
        movement.run(randomUUID(), itemId, line.qty, id, now);
      }
    }
  });
  return {
    id,
    totalPaise: total,
    lines: many("SELECT * FROM purchase_lines WHERE purchase_id = ?", id),
  };
}

export function listPurchases() {
  return many<{
    id: string;
    supplier_name: string | null;
    invoice_no: string | null;
    total_paise: number;
    created_at: string;
  }>("SELECT id, supplier_name, invoice_no, total_paise, created_at FROM purchases ORDER BY created_at DESC LIMIT 50");
}

export function assertWebhookSecret(header: string | null) {
  const merchant = getMerchant();
  if (!merchant) throw new Error("Set up the shop first");
  if (!header || header !== merchant.webhook_secret) throw new Error("Invalid webhook secret");
  return merchant;
}
