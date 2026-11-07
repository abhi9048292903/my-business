import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { priceBill } from "../src/lib/pricing";
import { parsePurchaseText } from "../src/lib/purchase-parse";
import { parseUpiSms } from "../src/lib/sms";
import { buildUpiUri } from "../src/lib/upi";
import { parseVoiceBill, matchVoiceLine } from "../src/lib/voice";

test("GST bill extracts CGST and SGST from an inclusive price", () => {
  const bill = priceBill(
    [
      { name: "Sugar", qty: 2, unitPricePaise: 5200, gstRate: 5, discountPercent: 0 },
      { name: "Milk", qty: 1, unitPricePaise: 5800, gstRate: 0 },
    ],
    { gstMode: "GST", billDiscountPercent: 5 },
  );
  assert.equal(bill.subtotalPaise, 16200);
  assert.equal(bill.totalPaise, 15390);
  assert.ok(bill.taxPaise > 0);
  assert.equal(bill.lines[0].cgstPaise + bill.lines[0].sgstPaise, bill.lines[0].taxPaise);
});

test("voice sentence becomes lines and a discount", () => {
  const parsed = parseVoiceBill("Add 2 kg sugar and 1 L milk, 5% discount for ramesh");
  assert.equal(parsed.discountPercent, 5);
  assert.equal(parsed.customerQuery, "ramesh");
  assert.equal(parsed.lines.length, 2);
  assert.equal(parsed.lines[0].query, "sugar");
  const hit = matchVoiceLine(parsed.lines[0], [
    { id: "item_sugar", name: "Sugar", unit: "kg" },
    { id: "item_milk", name: "Milk", unit: "L" },
  ]);
  assert.equal(hit?.item.id, "item_sugar");
});

test("purchase text and UPI SMS parse", () => {
  const purchase = parsePurchaseText("Sharma Wholesale\nInvoice No: SW-1044\nSugar 10 kg 44\nTea 5 pack 120");
  assert.equal(purchase.supplierName, "Sharma Wholesale");
  assert.equal(purchase.invoiceNo, "SW-1044");
  assert.equal(purchase.lines.length, 2);
  assert.equal(purchase.lines[0].unitCostPaise, 4400);

  const sms = parseUpiSms("INR 450.00 credited. UTR 123456789012 INV-1001");
  assert.equal(sms.amountPaise, 45000);
  assert.equal(sms.invoiceNumber, "INV1001");
  assert.equal(sms.utr, "123456789012");
});

test("UPI link locks the amount", () => {
  const uri = buildUpiUri({ vpa: "shop@okaxis", payeeName: "Lakshmi", amountPaise: 15390, invoiceNumber: "INV1001" });
  const params = new URL(uri.replace("upi://", "http://")).searchParams;
  assert.equal(params.get("pa"), "shop@okaxis");
  assert.equal(params.get("am"), "153.90");
  assert.equal(params.get("tn"), "INV1001");
});

test("invoice posts stock, udhar, and webhook reconciliation", async () => {
  process.env.HISAAB_DB = path.join(mkdtempSync(path.join(tmpdir(), "hisaab-")), "t.db");
  const billing = await import("../src/lib/billing.ts");
  const merchant = billing.createMerchant({
    businessName: "Lakshmi Stores",
    mobile: "9845099999",
    upiVpa: "shop@okaxis",
    sampleCatalog: true,
  });
  const customers = billing.listCustomers();
  const sunita = customers.find((customer) => customer.name === "Sunita Devi");
  assert.ok(sunita);
  assert.equal(sunita.balance_paise, 25000);

  const invoice = billing.createInvoice({
    paymentMode: "UPI",
    gstMode: "GST",
    lines: [{ itemId: "item_sugar", name: "Sugar", qty: 2, unitPricePaise: 5200, gstRate: 5, unit: "kg" }],
  });
  assert.equal(invoice.status, "UNPAID");
  assert.match(invoice.upi_uri || "", /am=104\.00/);
  const sugar = billing.listItems().find((item) => item.id === "item_sugar");
  assert.equal(sugar?.stock_qty, 38);

  assert.throws(() => billing.markInvoicePaid({
    invoiceId: invoice.id,
    amountPaise: 100,
    source: "UPI_WEBHOOK",
  }));
  const paid = billing.markInvoicePaid({
    invoiceId: invoice.id,
    amountPaise: invoice.total_paise,
    source: "UPI_WEBHOOK",
    utr: "123456789012",
  });
  assert.equal(paid.invoice.status, "PAID");
  assert.equal(paid.already, false);

  const credit = billing.createInvoice({
    paymentMode: "CREDIT",
    gstMode: "NON_GST",
    customerId: sunita.id,
    lines: [{ itemId: "item_milk", name: "Milk", qty: 1, unitPricePaise: 5800, gstRate: 0, unit: "L" }],
  });
  assert.equal(credit.status, "CREDIT");
  assert.equal(billing.listCustomers().find((customer) => customer.id === sunita.id)?.balance_paise, 30800);

  const sms = billing.reconcileSms(`Rs.58.00 received for ${credit.number}`);
  assert.equal(sms.matched, false);

  billing.cancelInvoice(credit.id);
  assert.equal(billing.listCustomers().find((customer) => customer.id === sunita.id)?.balance_paise, 25000);
  assert.equal(merchant.upi_vpa, "shop@okaxis");
});
