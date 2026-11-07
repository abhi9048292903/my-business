# Hisaab

Mobile-first billing till and amount-locked UPI POS for small businesses, freelancers, agencies, and retail counters. Bill in seconds with locked UPI QR totals, offline khata ledgers, and support for physical inventory, freelance contracts, and human resource staffing placements.

## Run

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first screen asks for your business type (Freelance, Human Resources & Staffing, Retail, or Hybrid), name, mobile, UPI ID, and optional GSTIN.

### Business Types & Services
- **Freelance & Consulting**: Hourly (`hr`), daily (`day`), and fixed-project (`project`) deliverables for web development, UI/UX design, cloud architecture, and marketing.
- **Human Resources & Staffing**: Placement and contract billing for specialized human resources (e.g. Senior Frontend Engineer, DevOps Specialist, Certified Electricians, Data Technicians) billed per `month`, `day`, `shift`, or `resource`, with dedicated skill tagging.
- **Retail & Store**: Physical goods with barcode scanner, stock counts, and low-stock alerts.
- **Hybrid**: Mix of services and physical products.

## Layout

```
src/app/                  screens and API routes
src/app/api/              merchant, items, catalog presets, invoices, webhooks, khata, purchases, sync
src/components/           till, payment sheet, catalog & services, khata, settings
src/lib/schema.sql        SQLite schema
src/lib/billing.ts        invoices, stock, services, ledger, reconciliation
src/lib/pricing.ts        inclusive GST, line and bill discounts
src/lib/seed.ts           pre-seeded catalogs for freelance, staffing/HR, and retail
src/lib/offline (client)  IndexedDB outbox
data/hisaab.db            created on first run
```

## Money

Amounts are integer paise. Selling prices are tax-inclusive. In GST mode the till pulls CGST and SGST out of the line (half each, intra-state). Non-GST mode charges the same shelf price with no tax breakup. Services automatically default to standard 18% GST with unmanaged inventory (`track_stock = 0`).

## Data

| Table | Holds |
| --- | --- |
| `merchant` | Shop name, mobile, UPI ID, GSTIN, business type, webhook secret, printer width |
| `categories`, `items` | Name, barcode, GST rate, stock, item type (`product` / `service`), skills, service type |
| `customers`, `ledger_entries` | Khata. Positive balance means the customer owes the business |
| `invoices`, `invoice_lines` | `UNPAID`, `PAID`, `CREDIT`, `CANCELLED` |
| `stock_movements` | Sale, purchase, cancel, manual count (physical goods only) |
| `purchases`, `purchase_lines` | Distributor bills after OCR review |
| `payment_events` | Webhook and SMS attempts |

## API

| Method | Path | Role |
| --- | --- | --- |
| `POST` | `/api/merchant` | Create business profile with business model type |
| `GET`, `PATCH` | `/api/merchant` | Read or edit profile, printer width, and business type |
| `POST` | `/api/catalog/preset` | Load / append service catalogs (freelance, staffing, retail) |
| `GET`, `POST` | `/api/items` | Catalog (items & services) |
| `PATCH`, `DELETE` | `/api/items/:id` | Edit or archive item / service |
| `POST` | `/api/invoices` | Price the cart, cut stock (if product), open UPI / cash / udhar |
| `GET` | `/api/invoices/:id` | Bill detail |
| `PATCH` | `/api/invoices/:id` | `{ "action": "cancel" }` restocks (if product) and reverses khata |
| `GET` | `/api/invoices/:id/pdf` | Thermal-width PDF with QR |
| `GET` | `/api/invoices/:id/events` | Server-sent payment status |
| `POST` | `/api/webhooks/upi` | `{ invoiceId, amountPaise, utr }` marks `PAID` only if the amount matches |
| `POST` | `/api/webhooks/sms` | `{ text }` parses a credit SMS |
| `POST` | `/api/voice/parse` | Speech transcript to catalog lines (supports hrs, days, months, resources) |
| `POST` | `/api/purchases` | `action: "parse"` or save stock |
| `POST` | `/api/sync` | Flush offline bills. Totals are recomputed |
| `GET`, `POST` | `/api/customers` and `/api/customers/:id/ledger` | Khata |
| `GET` | `/pay/:id` | Customer page: QR plus an `upi://` button for WhatsApp |

UPI payload shape: `upi://pay?pa=shop@okaxis&am=104.00&cu=INR&tn=INV1001&tr=INV1001`.

WhatsApp gets a link to `/pay/:id` (an `upi://` link is a poor fit for WhatsApp’s button URL). That page is the payment card: amount, QR, and **Pay with UPI**, which opens GPay, PhonePe, Paytm, or BHIM. If `WHATSAPP_TOKEN` is added later, `src/lib/whatsapp.ts` already builds the Cloud API interactive payload around that https link.

## Offline

The catalog is cached on the phone. If the network fails mid-bill, the bill is written to IndexedDB and a QR is still shown from the cached UPI ID. Coming back online posts `/api/sync`. `clientId` makes that retry safe. The service worker caches the app shell in production.

## Voice, scan, print

- Microphone uses the browser speech recognizer (`en-IN`), then the parser. A text box is there for the same sentences.
- Barcode uses the camera where `BarcodeDetector` exists, or a typed code. A USB scanner works in the search box.
- Purchase photos use Tesseract in the browser. Nothing is saved until the lines are confirmed. **Load sample distributor bill** shows the path without a camera.
- Print uses the 58 mm or 80 mm receipt. PDF is the same bill for sharing.

## Security notes

Treat the phone as the merchant’s device. The webhook secret is visible in Settings because the merchant is who configures the bank. Do not expose this server on the public internet without HTTPS and without turning off casual access to the till. Customer payment pages reveal only that one bill.
