"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { flushOutbox, pendingBills } from "@/lib/client/offline";
import { api, rememberShop, type Shop } from "@/lib/client/types";
import { HeaderActions, HeaderButton, HeaderLink, IconSettings, IconSun } from "@/components/HeaderActions";

const LINKS = [
  { href: "/", label: "Bill" },
  { href: "/inventory", label: "Catalog" },
  { href: "/khata", label: "Khata" },
  { href: "/invoices", label: "Bills" },
];

function applyTheme(theme: string) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("hisaab-theme", theme);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);
  const [contrast, setContrast] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ merchant: Shop }>("/api/merchant")
      .then((data) => {
        if (cancelled) return;
        rememberShop(data.merchant);
        setShop(data.merchant);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) router.replace("/setup");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const sync = () => {
      setOnline(navigator.onLine);
      pendingBills().then((rows) => setQueued(rows.length)).catch(() => {});
      if (navigator.onLine) {
        flushOutbox()
          .then((count) => {
            if (count) setQueued(0);
          })
          .catch(() => {});
      }
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    setContrast(document.documentElement.dataset.theme === "contrast");
  }, []);

  function toggleSun() {
    const current = document.documentElement.dataset.theme || "light";
    if (current === "contrast") {
      applyTheme(localStorage.getItem("hisaab-theme-prev") || "light");
      setContrast(false);
    } else {
      localStorage.setItem("hisaab-theme-prev", current);
      applyTheme("contrast");
      setContrast(true);
    }
  }

  if (!ready || !shop) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <p className="font-display text-3xl">Hisaab</p>
      </div>
    );
  }

  const typeLabel =
    shop.business_type === "freelance"
      ? "Freelance & Consulting"
      : shop.business_type === "staffing"
      ? "HR & Staffing"
      : shop.business_type === "hybrid"
      ? "Services & Goods"
      : "Retail & Goods";

  return (
    <div className="mx-auto min-h-dvh max-w-6xl lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-[var(--line)] px-4 py-6 lg:block">
        <p className="font-display text-3xl">Hisaab</p>
        <p className="mt-1 text-sm font-semibold">{shop.business_name}</p>
        <p className="text-xs muted">{typeLabel}</p>
        <nav className="mt-8 grid gap-2">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} className="nav-link rounded-2xl px-3 py-3 font-semibold">
              {link.label}
            </Link>
          ))}
          <Link href="/purchases" className="nav-link rounded-2xl px-3 py-3 font-semibold" aria-current={pathname === "/purchases" ? "page" : undefined}>
            Purchases
          </Link>
          <Link href="/settings" className="nav-link rounded-2xl px-3 py-3 font-semibold" aria-current={pathname === "/settings" ? "page" : undefined}>
            Settings
          </Link>
        </nav>
      </aside>
      <div>
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--bg)]/90 px-4 py-3 backdrop-blur">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] muted">Hisaab · {typeLabel}</p>
            <p className="font-semibold leading-tight">{shop.business_name}</p>
          </div>
          <HeaderActions>
            <span className="header-status">{online ? (queued ? `${queued} to sync` : "Online") : "Offline"}</span>
            <HeaderButton icon={<IconSun />} onClick={toggleSun} aria-pressed={contrast} aria-label="Toggle sunlight contrast">
              Sun
            </HeaderButton>
            <HeaderLink href="/settings" icon={<IconSettings />} className="header-btn-mobile" aria-label="Settings">
              Settings
            </HeaderLink>
          </HeaderActions>
        </header>
        <main className="px-4 pb-40 pt-4 lg:pb-10">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1 border-t border-[var(--line)] bg-[var(--elev)] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} className="nav-link rounded-2xl py-2 text-center text-sm font-bold">
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
