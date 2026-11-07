"use client";

import { useEffect, useState } from "react";
import { HeaderActions, HeaderButton, IconClose } from "@/components/HeaderActions";
import { api, type Party } from "@/lib/client/types";
import { formatINR } from "@/lib/money";

type Entry = {
  id: string;
  amount_paise: number;
  entry_type: string;
  note: string | null;
  created_at: string;
};

export function KhataScreen() {
  const [customers, setCustomers] = useState<Party[]>([]);
  const [selected, setSelected] = useState<Party | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const data = await api<{ customers: Party[] }>("/api/customers");
    setCustomers(data.customers);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load khata"));
  }, []);

  async function open(party: Party) {
    const data = await api<{ customer: Party; entries: Entry[] }>(`/api/customers/${party.id}/ledger`);
    setSelected(data.customer);
    setEntries(data.entries);
  }

  const outstanding = customers.reduce((sum, party) => sum + Math.max(0, party.balance_paise), 0);

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] muted">Udhar</p>
      <h1 className="font-display text-4xl">Khata</h1>
      <p className="mt-2 text-lg">People owe you <span className="font-display text-3xl">{formatINR(outstanding)}</span></p>
      <form
        className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={async (event) => {
          event.preventDefault();
          await api("/api/customers", { method: "POST", body: JSON.stringify({ name, mobile }) });
          setName("");
          setMobile("");
          await load();
        }}
      >
        <input className="field" required placeholder="Customer name" value={name} onChange={(event) => setName(event.target.value)} />
        <input className="field" placeholder="Mobile" value={mobile} onChange={(event) => setMobile(event.target.value)} />
        <button className="btn btn-primary" type="submit">Add</button>
      </form>
      {error ? <p className="mt-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
      <ul className="mt-4 grid gap-2">
        {customers.map((party) => (
          <li key={party.id}>
            <button type="button" className="surface flex w-full items-center justify-between p-3 text-left" onClick={() => open(party)}>
              <span>
                <span className="block font-semibold">{party.name}</span>
                <span className="text-sm muted">{party.mobile || "No mobile"}</span>
              </span>
              <span className="font-display text-2xl">{formatINR(party.balance_paise)}</span>
            </button>
          </li>
        ))}
      </ul>
      {selected ? (
        <div className="fixed inset-0 z-40 grid content-end bg-black/70 p-4" role="dialog" aria-label={`${selected.name} ledger`}>
          <div className="surface grid max-h-[85dvh] gap-3 overflow-auto p-4">
            <HeaderActions className="w-full">
              <HeaderButton icon={<IconClose />} onClick={() => setSelected(null)}>Close</HeaderButton>
            </HeaderActions>
            <div className="flex items-end justify-between">
              <div>
                <p className="font-display text-3xl">{selected.name}</p>
                <p className="muted">{selected.mobile}</p>
              </div>
              <p className="font-display text-3xl">{formatINR(selected.balance_paise)}</p>
            </div>
            <form
              className="flex gap-2"
              onSubmit={async (event) => {
                event.preventDefault();
                const data = await api<{ customer: Party; entries: Entry[] }>(`/api/customers/${selected.id}/ledger`, {
                  method: "POST",
                  body: JSON.stringify({ amountRupees: Number(amount), note: "Counter receipt" }),
                });
                setSelected(data.customer);
                setEntries(data.entries);
                setAmount("");
                await load();
              }}
            >
              <input className="field" required inputMode="decimal" placeholder="Amount received" value={amount} onChange={(event) => setAmount(event.target.value)} />
              <button className="btn btn-warm" type="submit">Receive</button>
            </form>
            <ul className="grid gap-2">
              {entries.map((entry) => (
                <li key={entry.id} className="flex justify-between gap-3 border-b border-[var(--line)] py-2 text-sm">
                  <span>
                    <span className="block font-semibold">{entry.entry_type}</span>
                    <span className="muted">{entry.note}</span>
                  </span>
                  <span className="font-bold">{formatINR(entry.amount_paise)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
