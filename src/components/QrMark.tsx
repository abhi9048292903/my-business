"use client";

import { useMemo } from "react";
import { qrModules } from "@/lib/qr";

export function QrMark({ text, label = "UPI QR code" }: { text: string; label?: string }) {
  const grid = useMemo(() => qrModules(text), [text]);
  const size = grid.length;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="h-full w-full">
      <rect width={size} height={size} fill="#ffffff" />
      {grid.flatMap((row, y) =>
        row.map((dark, x) => (dark ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000000" /> : null)),
      )}
    </svg>
  );
}
