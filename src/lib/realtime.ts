type Listener = (event: Record<string, unknown>) => void;

const channels = new Map<string, Set<Listener>>();

export function subscribeInvoice(invoiceId: string, listener: Listener): () => void {
  let set = channels.get(invoiceId);
  if (!set) {
    set = new Set();
    channels.set(invoiceId, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) channels.delete(invoiceId);
  };
}

export function publishInvoice(invoiceId: string, event: Record<string, unknown>) {
  channels.get(invoiceId)?.forEach((listener) => {
    try {
      listener(event);
    } catch {
      /* a closed stream should not block payment posting */
    }
  });
}
