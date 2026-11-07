# Hisaab

Mobile-first billing till for a kirana, a service counter, or a small wholesaler. A bill is a few taps. The UPI QR is locked to that exact total. Stock and khata update with the bill, including while the shop is offline.

## Run

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first screen asks for the shop name, mobile, UPI ID, and optional GSTIN. Leave “sample grocery catalog” on.

Try a bill: tap Sugar and Milk, then **Show QR**. **Confirm UPI received** runs the same webhook a bank would call, and the till speaks the amount. Barcode `8901001000011` is Sugar. Voice text `2 kg sugar and 1 L milk, 5% discount` fills the cart.

## Layout

```
src/app/                  screens and API routes
src/app/api/              merchant, items, invoices, webhooks, khata, purchases, sync
src/components/           till, payment sheet, stock, khata, settings
src/lib/schema.sql        SQLite schema
src/lib/billing.ts        invoices, stock, ledger, reconciliation
src/lib/pricing.ts        inclusive GST, line and bill discounts
src/lib/offline (client)  IndexedDB outbox
data/hisaab.db            created on first run
```

The phone is a PWA (React, Next.js). The till talks to Route Handlers on the same origin. Those handlers use Node’s built-in SQLite. An in-process listener pushes payment status to the open QR screen; a bank can later point at the same webhook. Redis is not required for one counter. The listener is the piece you would swap for Redis pub/sub if several terminals share one server.

## Money

Amounts are integer paise. Selling prices are tax-inclusive. In GST mode the till pulls CGST and SGST out of the line (half each, intra-state). Non-GST mode charges the same shelf price with no tax breakup.

## Data

| Table | Holds |
| --- | --- |
| `merchant` | Shop name, mobile, UPI ID, GSTIN, webhook secret, printer width |
| `categories`, `items` | Shelf, barcode, GST rate, stock, low-stock line |
| `customers`, `ledger_entries` | Khata. Positive balance means the customer owes the shop |
| `invoices`, `invoice_lines` | `UNPAID`, `PAID`, `CREDIT`, `CANCELLED` |
| `stock_movements` | Sale, purchase, cancel, manual count |
| `purchases`, `purchase_lines` | Distributor bills after OCR review |
| `payment_events` | Webhook and SMS attempts |

UPI ID is the shop’s public address. The app does not ask for a UPI PIN or net-banking password. The webhook secret lives in Settings and must be sent as `x-webhook-secret`.

## API

| Method | Path | Role |
| --- | --- | --- |
| `POST` | `/api/merchant` | Create the shop |
| `GET`, `PATCH` | `/api/merchant` | Read or edit profile and printer width |
| `GET`, `POST` | `/api/items` | Catalog |
| `PATCH`, `DELETE` | `/api/items/:id` | Edit or archive |
| `POST` | `/api/invoices` | Price the cart, cut stock, open UPI / cash / udhar |
| `GET` | `/api/invoices/:id` | Bill detail |
| `PATCH` | `/api/invoices/:id` | `{ "action": "cancel" }` restocks and reverses khata |
| `GET` | `/api/invoices/:id/pdf` | Thermal-width PDF with QR |
| `GET` | `/api/invoices/:id/events` | Server-sent payment status |
| `POST` | `/api/webhooks/upi` | `{ invoiceId, amountPaise, utr }` marks `PAID` only if the amount matches |
| `POST` | `/api/webhooks/sms` | `{ text }` parses a credit SMS |
| `POST` | `/api/voice/parse` | Speech transcript to catalog lines |
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
