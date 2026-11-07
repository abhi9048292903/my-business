"use client";

import { useParams } from "next/navigation";
import { PayScreen } from "@/components/PayScreen";

export default function CustomerPayPage() {
  const params = useParams<{ id: string }>();
  return <PayScreen id={params.id} />;
}
