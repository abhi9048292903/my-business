"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { queueBill } from "@/lib/client/offline";
import { api, rememberedShop, type BillView, type CatalogItem, type Category, type Party } from "@/lib/client/types";
import { formatINR } from "@/lib/money";
import { priceBill, type GstMode } from "@/lib/pricing";
import { buildUpiUri } from "@/lib/upi";
import { HeaderActions, HeaderButton, IconClose, IconMic, IconScan } from "./HeaderActions";
import { PaymentModal } from "./PaymentModal";

type CartLine = {
  key: string;
  itemId?: string;
  name: string;
  unit: string;
  qty: number;
  unitPricePaise: number;
  discountPercent: number;
  gstRate: number;
  note: string;
};

type Report = {
  billedPaise: number;
  collectedPaise: number;
  unpaidCount: number;
  lowStock: CatalogItem[];
};

type SpeechCtor = new () => {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};

function qtyText(qty: number) {
  return Number.isInteger(qty) ? String(qty) : String(Math.round(qty * 1000) / 1000);
}

function offlineError(error: unknown) {
  if (error instanceof TypeError) return true;
  return error instanceof Error && /fetch|network|failed/i.test(error.message);
}

export function PosScreen() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Party[]>([]);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [gstMode, setGstMode] = useState<GstMode>("GST");
  const [billDiscount, setBillDiscount] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [paymentMode, setPaymentMode] = useState<"UPI" | "CASH" | "CREDIT">("UPI");
  const [notes, setNotes] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceText, setVoiceText] = useState("2 kg sugar and 1 L milk, 5% discount");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [bill, setBill] = useState<BillView | null>(null);
  const [payUrl, setPayUrl] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const cached = localStorage.getItem("hisaab-catalog");
    if (cached) {
      const parsed = JSON.parse(cached) as { items: CatalogItem[]; categories: Category[] };
      setItems(parsed.items);
      setCategories(parsed.categories);
    }
    api<{ items: CatalogItem[]; categories: Category[] }>("/api/items")
      .then((data) => {
        setItems(data.items);
        setCategories(data.categories);
        localStorage.setItem("hisaab-catalog", JSON.stringify(data));
      })
      .catch(() => setToast("Showing the catalog saved on this phone."));
    api<{ customers: Party[] }>("/api/customers")
      .then((data) => setCustomers(data.customers))
      .catch(() => {});
    api<Report>("/api/reports/today")
      .then(setReport)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const categoryOk = categoryId === "all" || item.category_id === categoryId;
      const text = `${item.name} ${item.barcode || ""}`.toLowerCase();
      return categoryOk && (!q || text.includes(q));
    });
  }, [items, query, categoryId]);

  const priced = useMemo(
    () => priceBill(cart, { gstMode, billDiscountPercent: billDiscount }),
    [cart, gstMode, billDiscount],
  );

  function addItem(item: CatalogItem, qty = 1) {
    setCart((current) => {
      const found = current.find((line) => line.itemId === item.id);
      if (found) return current.map((line) => (line.key === found.key ? { ...line, qty: line.qty + qty } : line));
      return [
        ...current,
        {
          key: item.id,
          itemId: item.id,
          name: item.name,
          unit: item.unit,
          qty,
          unitPricePaise: item.price_paise,
          discountPercent: 0,
          gstRate: item.gst_rate,
          note: "",
        },
      ];
    });
    navigator.vibrate?.(12);
  }

  function updateLine(key: string, patch: Partial<CartLine>) {
    setCart((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  async function applyVoice(transcript: string) {
    const data = await api<{
      parsed: { discountPercent: number };
      customer: Party | null;
      matched: Array<{ qty: number; query: string; item: { id: string; name: string } | null }>;
    }>("/api/voice/parse", {
      method: "POST",
      body: JSON.stringify({ transcript }),
    });
    const missed: string[] = [];
    for (const line of data.matched) {
      if (!line.item) {
        missed.push(line.query);
        continue;
      }
      const item = items.find((entry) => entry.id === line.item?.id);
      if (item) addItem(item, line.qty);
    }
    if (data.parsed.discountPercent) setBillDiscount(data.parsed.discountPercent);
    if (data.customer) setCustomerId(data.customer.id);
    setToast(missed.length ? `Could not match: ${missed.join(", ")}` : "Added from voice");
    setVoiceOpen(false);
    setCartOpen(true);
  }

  function listen() {
    const ctor = (window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: SpeechCtor }).webkitSpeechRecognition;
    if (!ctor) {
      setToast("Type the bill below. This browser has no microphone recognition.");
      return;
    }
    const recognition = new ctor();
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceText(transcript);
      applyVoice(transcript).catch((error) => setToast(error instanceof Error ? error.message : "Voice failed"));
    };
    recognition.onerror = () => setToast("Could not hear that. Try again.");
    recognition.start();
  }

  async function charge() {
    if (!priced.lines.length || busy) return;
    if (paymentMode === "CREDIT" && !customerId) {
      setToast("Choose who the udhar is for.");
      setCartOpen(true);
      return;
    }
    setBusy(true);
    const clientId = crypto.randomUUID();
    const payload = {
      clientId,
      lines: cart.map((line) => ({
        itemId: line.itemId,
        name: line.name,
        unit: line.unit,
        qty: line.qty,
        unitPricePaise: line.unitPricePaise,
        discountPercent: line.discountPercent,
        gstRate: line.gstRate,
        note: line.note,
      })),
      gstMode,
      billDiscountPercent: billDiscount,
      paymentMode,
      customerId: customerId || null,
      notes,
    };
    try {
      const data = await api<{ invoice: BillView; payUrl: string }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setBill({ ...data.invoice, lines: data.invoice.lines });
      setPayUrl(data.payUrl);
      setCart([]);
      setCartOpen(false);
      setNotes("");
      setBillDiscount(0);
      const [catalog, today] = await Promise.all([
        api<{ items: CatalogItem[]; categories: Category[] }>("/api/items"),
        api<Report>("/api/reports/today"),
      ]);
      setItems(catalog.items);
      setCategories(catalog.categories);
      localStorage.setItem("hisaab-catalog", JSON.stringify(catalog));
      setReport(today);
    } catch (error) {
      if (offlineError(error)) {
        const shop = rememberedShop();
        if (!shop) {
          setToast("Connect once so this phone can bill offline.");
          setBusy(false);
          return;
        }
        await queueBill({ ...payload, createdAt: new Date().toISOString() });
        const local: BillView = {
          id: clientId,
          number: "OFFLINE",
          status: paymentMode === "CASH" ? "PAID" : paymentMode === "CREDIT" ? "CREDIT" : "UNPAID",
          payment_mode: paymentMode,
          gst_mode: gstMode,
          subtotal_paise: priced.subtotalPaise,
          discount_paise: priced.discountPaise,
          tax_paise: priced.taxPaise,
          total_paise: priced.totalPaise,
          upi_uri: buildUpiUri({
            vpa: shop.upi_vpa,
            payeeName: shop.business_name,
            amountPaise: priced.totalPaise,
            invoiceNumber: clientId.slice(0, 12),
          }),
          customer_name: customers.find((party) => party.id === customerId)?.name || null,
          created_at: new Date().toISOString(),
          local: true,
          lines: priced.lines.map((line) => ({
            name: line.name,
            qty: line.qty,
            unit: line.unit,
            line_total_paise: line.lineTotalPaise,
            note: line.note,
          })),
        };
        setBill(local);
        setPayUrl("");
        setCart([]);
        setCartOpen(false);
      } else {
        setToast(error instanceof Error ? error.message : "Could not bill");
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!scanOpen) return;
    let stop = false;
    let stream: MediaStream | null = null;
    const detectorCtor = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
    if (!detectorCtor || !videoRef.current) return;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((media) => {
      stream = media;
      if (!videoRef.current) return;
      videoRef.current.srcObject = media;
      void videoRef.current.play();
      const detector = new detectorCtor({ formats: ["ean_13", "ean_8", "code_128", "upc_a", "upc_e", "qr_code"] });
      const tick = async () => {
        if (stop || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) {
            lookupBarcode(codes[0].rawValue);
            setScanOpen(false);
            return;
          }
        } catch {
          /* frame not ready */
        }
        requestAnimationFrame(() => void tick());
      };
      void tick();
    }).catch(() => setToast("Camera is unavailable. Type the barcode."));
    return () => {
      stop = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [scanOpen]);

  function lookupBarcode(code: string) {
    const item = items.find((entry) => entry.barcode === code.trim());
    if (!item) setToast(`No item for ${code}`);
    else addItem(item);
    setScanOpen(false);
  }

  const customer = customers.find((party) => party.id === customerId);
  const cartProps = {
    cart,
    priced,
    gstMode,
    billDiscount,
    customers,
    customerId,
    paymentMode,
    notes,
    busy,
    onGst: setGstMode,
    onDiscount: setBillDiscount,
    onCustomer: setCustomerId,
    onMode: setPaymentMode,
    onNotes: setNotes,
    onLine: updateLine,
    onRemove: (key: string) => setCart((current) => current.filter((line) => line.key !== key)),
    onCharge: charge,
    onCustom: () => setCustomOpen(true),
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-4">
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] muted">Today</p>
            <p className="font-display text-3xl leading-none">{formatINR(report?.billedPaise || 0)}</p>
          </div>
          <p className="text-right text-sm muted">
            Collected {formatINR(report?.collectedPaise || 0)}
            <br />
            {report?.unpaidCount || 0} waiting
          </p>
        </div>
        {report?.lowStock?.length ? (
          <p className="mb-3 rounded-2xl border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--warn)]">
            Low stock: {report.lowStock.map((item) => item.name).slice(0, 3).join(", ")}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <input
            ref={searchRef}
            className="field min-w-0 flex-1"
            placeholder="Search item or barcode"
            value={query}
            aria-label="Search items"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && visible[0]) addItem(visible[0]);
            }}
          />
          <HeaderActions>
            <HeaderButton icon={<IconScan />} onClick={() => setScanOpen(true)}>Scan</HeaderButton>
            <HeaderButton variant="primary" icon={<IconMic />} onClick={() => setVoiceOpen(true)} aria-label="Voice bill">Mic</HeaderButton>
          </HeaderActions>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button type="button" className="pill" aria-pressed={categoryId === "all"} onClick={() => setCategoryId("all")}>All</button>
          {categories.map((category) => (
            <button key={category.id} type="button" className="pill" aria-pressed={categoryId === category.id} onClick={() => setCategoryId(category.id)}>
              {category.name}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visible.map((item) => (
            <button key={item.id} type="button" onClick={() => addItem(item)} className="surface min-h-[92px] p-3 text-left">
              <span className="block font-semibold leading-tight">{item.name}</span>
              <span className="mt-2 flex items-end justify-between gap-2">
                <span className="font-display text-2xl leading-none">{formatINR(item.price_paise)}</span>
                <span className="text-xs font-bold muted">/{item.unit}</span>
              </span>
              <span className={`mt-1 block text-xs font-bold ${item.stock_qty <= item.low_stock_qty ? "text-[var(--warn)]" : "muted"}`}>
                {qtyText(item.stock_qty)} in stock
              </span>
            </button>
          ))}
        </div>
      </section>

      <aside className="sticky top-20 hidden lg:block">
        <div className="surface grid max-h-[calc(100dvh-6.5rem)] gap-3 overflow-auto p-3">
          <CartEditor {...cartProps} />
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-[4.6rem] z-20 px-3 lg:hidden">
        <div className="surface flex items-center justify-between gap-3 p-3">
          <button type="button" className="text-left" onClick={() => setCartOpen(true)}>
            <span className="block text-sm font-bold">{cart.length} items</span>
            <span className="font-display text-3xl leading-none">{formatINR(priced.totalPaise)}</span>
          </button>
          <button type="button" className="btn btn-warm" disabled={!cart.length || busy} onClick={charge}>
            {paymentMode === "UPI" ? "Show QR" : "Charge"}
          </button>
        </div>
      </div>

      {cartOpen ? (
        <div className="fixed inset-0 z-40 flex flex-col bg-[var(--bg)] lg:hidden" role="dialog" aria-label="Current bill">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="font-display text-3xl">Bill</p>
            <HeaderActions>
              <HeaderButton icon={<IconClose />} onClick={() => setCartOpen(false)}>Close</HeaderButton>
            </HeaderActions>
          </div>
          <div className="grid flex-1 gap-3 overflow-auto px-4 pb-4">
            <CartEditor {...cartProps} />
          </div>
          <div className="border-t border-[var(--line)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="button" className="btn btn-warm w-full" disabled={!cart.length || busy} onClick={charge}>
              {paymentMode === "UPI" ? "Show QR" : "Charge"} · {formatINR(priced.totalPaise)}
            </button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <button type="button" className="fixed top-20 left-1/2 z-40 max-w-sm -translate-x-1/2 rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--bg)]" onClick={() => setToast("")}>
          {toast}
        </button>
      ) : null}

      {scanOpen ? (
        <div className="fixed inset-0 z-40 grid content-end bg-black/80 p-4" role="dialog" aria-label="Barcode scanner">
          <div className="surface grid gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">Scan barcode</p>
              <HeaderActions>
                <HeaderButton icon={<IconClose />} onClick={() => setScanOpen(false)}>Close</HeaderButton>
              </HeaderActions>
            </div>
            <video ref={videoRef} className="max-h-64 w-full rounded-2xl bg-black" muted playsInline />
            <input className="field" autoFocus placeholder="Type barcode, e.g. 8901001000011" aria-label="Barcode" onKeyDown={(event) => {
              if (event.key === "Enter") lookupBarcode((event.target as HTMLInputElement).value);
            }} />
          </div>
        </div>
      ) : null}

      {voiceOpen ? (
        <div className="fixed inset-0 z-40 grid content-end bg-black/70 p-4" role="dialog" aria-label="Voice bill">
          <form
            className="surface grid gap-3 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              applyVoice(voiceText).catch((error) => setToast(error instanceof Error ? error.message : "Voice failed"));
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-3xl">Speak the bill</p>
              <HeaderActions>
                <HeaderButton icon={<IconClose />} onClick={() => setVoiceOpen(false)}>Close</HeaderButton>
              </HeaderActions>
            </div>
            <p className="text-sm muted">Try “2 kg sugar and 1 L milk, 5% discount”.</p>
            <button type="button" className="btn btn-primary" onClick={listen}>Listen</button>
            <textarea className="field min-h-24 py-3" value={voiceText} onChange={(event) => setVoiceText(event.target.value)} aria-label="Voice transcript" />
            <button className="btn btn-warm" type="submit">Add to bill</button>
          </form>
        </div>
      ) : null}

      {customOpen ? (
        <form
          className="fixed inset-0 z-40 grid content-end bg-black/70 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const price = Math.round(Number(customPrice) * 100);
            if (!customName.trim() || !(price > 0)) return;
            setCart((current) => [
              ...current,
              { key: crypto.randomUUID(), name: customName.trim(), unit: "pcs", qty: 1, unitPricePaise: price, discountPercent: 0, gstRate: 0, note: "" },
            ]);
            setCustomName("");
            setCustomPrice("");
            setCustomOpen(false);
            setCartOpen(true);
          }}
        >
          <div className="surface grid gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">Custom item</p>
              <HeaderActions>
                <HeaderButton icon={<IconClose />} onClick={() => setCustomOpen(false)}>Close</HeaderButton>
              </HeaderActions>
            </div>
            <input className="field" placeholder="Name" value={customName} onChange={(event) => setCustomName(event.target.value)} required />
            <input className="field" placeholder="Price" inputMode="decimal" value={customPrice} onChange={(event) => setCustomPrice(event.target.value)} required />
            <button className="btn btn-primary" type="submit">Add</button>
          </div>
        </form>
      ) : null}

      {bill ? (
        <PaymentModal
          bill={bill}
          payUrl={payUrl}
          customerMobile={customer?.mobile}
          onClose={() => setBill(null)}
          onChanged={setBill}
        />
      ) : null}
    </div>
  );
}

function CartEditor(props: {
  cart: CartLine[];
  priced: ReturnType<typeof priceBill>;
  gstMode: GstMode;
  billDiscount: number;
  customers: Party[];
  customerId: string;
  paymentMode: "UPI" | "CASH" | "CREDIT";
  notes: string;
  busy: boolean;
  onGst: (mode: GstMode) => void;
  onDiscount: (value: number) => void;
  onCustomer: (id: string) => void;
  onMode: (mode: "UPI" | "CASH" | "CREDIT") => void;
  onNotes: (value: string) => void;
  onLine: (key: string, patch: Partial<CartLine>) => void;
  onRemove: (key: string) => void;
  onCharge: () => void;
  onCustom: () => void;
}) {
  return (
    <>
      <div className="hidden items-center justify-between lg:flex">
        <p className="font-display text-4xl leading-none">{formatINR(props.priced.totalPaise)}</p>
        <p className="text-sm font-bold muted">{props.cart.length} items</p>
      </div>
      {props.cart.length === 0 ? <p className="text-sm muted">Tap items to start a bill. A full grocery bill should take a few taps.</p> : null}
      <div className="grid max-h-64 gap-2 overflow-auto lg:max-h-none">
        {props.cart.map((line) => (
          <div key={line.key} className="rounded-2xl border border-[var(--line)] p-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{line.name}</p>
              <button type="button" className="text-sm font-bold text-[var(--danger)]" onClick={() => props.onRemove(line.key)}>Remove</button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-ghost min-h-10 w-10 px-0" onClick={() => props.onLine(line.key, { qty: Math.max(0.5, line.qty - (line.unit === "kg" || line.unit === "L" ? 0.5 : 1)) })} aria-label={`Decrease ${line.name}`}>−</button>
              <span className="min-w-16 text-center font-bold">{qtyText(line.qty)} {line.unit}</span>
              <button type="button" className="btn btn-ghost min-h-10 w-10 px-0" onClick={() => props.onLine(line.key, { qty: line.qty + (line.unit === "kg" || line.unit === "L" ? 0.5 : 1) })} aria-label={`Increase ${line.name}`}>+</button>
              <label className="text-xs font-bold muted">
                Disc %
                <input className="field mt-1 w-20" inputMode="decimal" value={line.discountPercent} onChange={(event) => props.onLine(line.key, { discountPercent: Number(event.target.value) || 0 })} aria-label={`${line.name} discount percent`} />
              </label>
            </div>
            <input className="field mt-2" placeholder="Note, optional" value={line.note} onChange={(event) => props.onLine(line.key, { note: event.target.value })} aria-label={`${line.name} note`} />
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-ghost" onClick={props.onCustom}>Custom item</button>
      <div className="grid grid-cols-3 gap-2">
        {(["UPI", "CASH", "CREDIT"] as const).map((mode) => (
          <button key={mode} type="button" className="pill" aria-pressed={props.paymentMode === mode} onClick={() => props.onMode(mode)}>
            {mode === "CREDIT" ? "Udhar" : mode === "CASH" ? "Cash" : "UPI"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="pill" aria-pressed={props.gstMode === "GST"} onClick={() => props.onGst("GST")}>GST</button>
        <button type="button" className="pill" aria-pressed={props.gstMode === "NON_GST"} onClick={() => props.onGst("NON_GST")}>Non-GST</button>
      </div>
      <label className="text-sm font-semibold">
        Bill discount %
        <input className="field mt-1" inputMode="decimal" value={props.billDiscount} onChange={(event) => props.onDiscount(Number(event.target.value) || 0)} />
      </label>
      <label className="text-sm font-semibold">
        Customer
        <select className="field mt-1" value={props.customerId} onChange={(event) => props.onCustomer(event.target.value)}>
          <option value="">Walk-in</option>
          {props.customers.map((party) => (
            <option key={party.id} value={party.id}>{party.name}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold">
        Bill note
        <input className="field mt-1" value={props.notes} onChange={(event) => props.onNotes(event.target.value)} />
      </label>
      <div className="text-sm">
        <p className="flex justify-between"><span>Subtotal</span><span>{formatINR(props.priced.subtotalPaise)}</span></p>
        <p className="flex justify-between"><span>Discount</span><span>{formatINR(props.priced.discountPaise)}</span></p>
        <p className="flex justify-between"><span>GST included</span><span>{formatINR(props.priced.taxPaise)}</span></p>
      </div>
      <button type="button" className="btn btn-warm hidden lg:inline-flex" disabled={!props.cart.length || props.busy} onClick={props.onCharge}>
        {props.paymentMode === "UPI" ? "Generate QR" : "Save bill"}
      </button>
    </>
  );
}
