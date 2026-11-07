export type OutboxBill = {
  clientId: string;
  lines: unknown[];
  gstMode: "GST" | "NON_GST";
  billDiscountPercent: number;
  paymentMode: "UPI" | "CASH" | "CREDIT";
  customerId?: string | null;
  notes?: string;
  createdAt: string;
};

const DB_NAME = "hisaab-offline";
const OUTBOX = "outbox";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OUTBOX)) db.createObjectStore(OUTBOX, { keyPath: "clientId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueBill(bill: OutboxBill): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(OUTBOX, "readwrite");
  tx.objectStore(OUTBOX).put(bill);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function pendingBills(): Promise<OutboxBill[]> {
  const db = await openDb();
  const tx = db.transaction(OUTBOX, "readonly");
  const rows = await requestToPromise(tx.objectStore(OUTBOX).getAll() as IDBRequest<OutboxBill[]>);
  db.close();
  return rows;
}

export async function removeBills(clientIds: string[]): Promise<void> {
  if (!clientIds.length) return;
  const db = await openDb();
  const tx = db.transaction(OUTBOX, "readwrite");
  const store = tx.objectStore(OUTBOX);
  for (const id of clientIds) store.delete(id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function flushOutbox(): Promise<number> {
  const pending = await pendingBills();
  if (!pending.length) return 0;
  const response = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invoices: pending.map((bill) => ({
        clientId: bill.clientId,
        lines: bill.lines,
        gstMode: bill.gstMode,
        billDiscountPercent: bill.billDiscountPercent,
        paymentMode: bill.paymentMode,
        customerId: bill.customerId,
        notes: bill.notes,
      })),
    }),
  });
  if (!response.ok) throw new Error("Sync failed");
  await removeBills(pending.map((bill) => bill.clientId));
  return pending.length;
}
