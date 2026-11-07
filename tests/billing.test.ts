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

test("service items support freelance work and human resources with skills and no stock decrement", async () => {
  process.env.HISAAB_DB = path.join(mkdtempSync(path.join(tmpdir(), "hisaab-services-")), "t.db");
  const billing = await import("../src/lib/billing.ts");
  const merchant = billing.createMerchant({
    businessName: "TalentForge & Dev Studio",
    mobile: "9876543210",
    upiVpa: "talentforge@okaxis",
    businessType: "staffing",
    sampleCatalog: true,
  });

  assert.equal(merchant.business_type, "staffing");

  // Check that staffing preset seeded categories and services
  const categories = billing.listCategories();
  assert.ok(categories.some((c) => c.name.includes("Engineering Staffing") || c.name.includes("Talent")));

  const items = billing.listItems();
  const frontendDev = items.find((i) => i.id === "hr_senior_frontend");
  assert.ok(frontendDev);
  assert.equal(frontendDev?.item_type, "service");
  assert.equal(frontendDev?.unit, "month");
  assert.equal(frontendDev?.track_stock, 0);
  assert.ok(frontendDev?.skills?.includes("React"));

  // Create custom freelance service
  const freelanceWork = billing.createItem({
    name: "Custom Full-Stack Web Development",
    unit: "hr",
    pricePaise: 250000, // ₹2500/hr
    gstRate: 18,
    itemType: "service",
    serviceType: "freelance",
    skills: "React, Node.js, Next.js, GraphQL",
  });

  assert.equal(freelanceWork.item_type, "service");
  assert.equal(freelanceWork.track_stock, 0);
  assert.equal(freelanceWork.skills, "React, Node.js, Next.js, GraphQL");

  // Bill 40 hours of freelance work and 2 months of HR frontend dev placement
  const invoice = billing.createInvoice({
    paymentMode: "UPI",
    gstMode: "GST",
    lines: [
      {
        itemId: freelanceWork.id,
        name: freelanceWork.name,
        qty: 40,
        unit: freelanceWork.unit,
        unitPricePaise: freelanceWork.price_paise,
        gstRate: freelanceWork.gst_rate,
      },
      {
        itemId: frontendDev.id,
        name: frontendDev.name,
        qty: 2,
        unit: frontendDev.unit,
        unitPricePaise: frontendDev.price_paise,
        gstRate: frontendDev.gst_rate,
      },
    ],
  });

  assert.equal(invoice.status, "UNPAID");
  // 40 * 2500 = 100,000 + 2 * 125,000 = 250,000 => total 350,000 rupees => 35,000,000 paise
  assert.equal(invoice.subtotal_paise, 35000000);
  assert.equal(invoice.total_paise, 35000000);

  // Verify stock was not touched and remains 0
  const refreshedWork = billing.listItems().find((i) => i.id === freelanceWork.id);
  assert.equal(refreshedWork?.stock_qty, 0);
  const refreshedHR = billing.listItems().find((i) => i.id === frontendDev.id);
  assert.equal(refreshedHR?.stock_qty, 0);

  // Cancelling does not alter stock
  billing.cancelInvoice(invoice.id);
  const afterCancel = billing.listItems().find((i) => i.id === freelanceWork.id);
  assert.equal(afterCancel?.stock_qty, 0);
});

test("voice parses service units including hours, days, months, and resources", () => {
  const parsed = parseVoiceBill("Add 10 hrs web development and 1 month senior devops engineer for acme");
  assert.equal(parsed.customerQuery, "acme");
  assert.equal(parsed.lines.length, 2);
  assert.equal(parsed.lines[0].qty, 10);
  assert.equal(parsed.lines[0].unit, "hr");
  assert.equal(parsed.lines[0].query, "web development");
  assert.equal(parsed.lines[1].qty, 1);
  assert.equal(parsed.lines[1].unit, "month");
  assert.equal(parsed.lines[1].query, "senior devops engineer");
});
