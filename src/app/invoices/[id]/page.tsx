"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { InvoicesScreen } from "@/components/InvoicesScreen";

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  return (
    <AppShell>
      <InvoicesScreen focusId={params.id} />
    </AppShell>
  );
}
