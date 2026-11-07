export type VoiceLine = {
  qty: number;
  unit: string | null;
  query: string;
};

export type VoiceParse = {
  lines: VoiceLine[];
  discountPercent: number;
  customerQuery: string | null;
  remainder: string;
};

const UNIT_TOKENS = [
  "hours", "hour", "hrs", "hr",
  "months", "month", "mo",
  "days", "day",
  "shifts", "shift",
  "projects", "project",
  "resources", "resource",
  "persons", "person",
  "devs", "dev",
  "visits", "visit",
  "litres", "liters", "litre", "liter", "ltr", "l",
  "grams", "gram", "gms", "gm", "g",
  "pieces", "piece", "pcs", "pc",
  "packets", "packet", "packs", "pack", "pkts", "pkt",
  "dozens", "dozen",
  "kgs", "kg",
  "ml",
];

const UNIT = UNIT_TOKENS.sort((a, b) => b.length - a.length).join("|");

const UNIT_MAP: Record<string, string> = {
  kg: "kg",
  kgs: "kg",
  g: "g",
  gm: "g",
  gram: "g",
  grams: "g",
  l: "L",
  ltr: "L",
  litre: "L",
  liters: "L",
  liter: "L",
  litres: "L",
  ml: "ml",
  pcs: "pcs",
  pc: "pcs",
  piece: "pcs",
  pieces: "pcs",
  pack: "pack",
  packet: "pack",
  pkt: "pack",
  dozen: "dozen",
  hr: "hr",
  hrs: "hr",
  hour: "hr",
  hours: "hr",
  day: "day",
  days: "day",
  month: "month",
  months: "month",
  mo: "month",
  resource: "resource",
  resources: "resource",
  person: "person",
  persons: "person",
  dev: "resource",
  devs: "resource",
  shift: "shift",
  shifts: "shift",
  project: "project",
  projects: "project",
  visit: "visit",
  visits: "visit",
};

export function parseVoiceBill(transcript: string): VoiceParse {
  let text = transcript.trim().replace(/\s+/g, " ");
  let discountPercent = 0;
  const discount = text.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:discount|off)?/i);
  if (discount && /discount|off|%/i.test(text)) {
    discountPercent = Math.min(100, Math.max(0, Number(discount[1])));
    text = text.replace(discount[0], " ");
  }

  let customerQuery: string | null = null;
  const customer = text.match(/\b(?:for|customer)\s+([a-z][a-z\s]{1,40})$/i);
  if (customer) {
    customerQuery = customer[1].trim();
    text = text.slice(0, customer.index).trim();
  }

  text = text.replace(/^(please\s+)?(add|bill|put|include)\s+/i, "");
  const chunks = text
    .split(/\s+and\s+|,|;/i)
    .map((part) => part.trim())
    .filter(Boolean);

  const lines: VoiceLine[] = [];
  const unmatched: string[] = [];
  const lead = new RegExp(
    `^(\\d+(?:\\.\\d+)?)\\s*(${UNIT})?\\s*(?:of\\s+)?(.+)$`,
    "i",
  );

  for (const chunk of chunks) {
    const match = chunk.match(lead);
    if (!match) {
      if (chunk.length > 1) unmatched.push(chunk);
      continue;
    }
    const unitRaw = match[2]?.toLowerCase() ?? null;
    lines.push({
      qty: Number(match[1]),
      unit: unitRaw ? UNIT_MAP[unitRaw] || unitRaw : null,
      query: match[3].replace(/^(a|an|the)\s+/i, "").trim(),
    });
  }

  return {
    lines: lines.filter((line) => line.query.length > 0 && line.qty > 0),
    discountPercent,
    customerQuery,
    remainder: unmatched.join(", "),
  };
}

export type MatchableItem = {
  id: string;
  name: string;
  unit: string;
  aliases?: string[];
};

const ALIASES: Record<string, string[]> = {
  sugar: ["chini", "cheeni", "shakkar"],
  milk: ["doodh", "dudh", "milk"],
  rice: ["chawal", "rice"],
  "wheat flour": ["atta", "aata", "gehun"],
  "toor dal": ["arhar", "toor", "tuvar"],
  "cooking oil": ["oil", "tel"],
  salt: ["namak"],
  tea: ["chai"],
  bread: ["bread", "pav"],
  curd: ["dahi", "curd"],
  eggs: ["anda", "ande", "egg", "eggs"],
  biscuits: ["biscuit", "cookies"],
  "instant noodles": ["maggi", "noodles"],
  cola: ["coke", "cold drink", "soft drink"],
  onion: ["pyaaz", "pyaz", "onion"],
  tomato: ["tamatar", "tomato"],
  potato: ["aloo", "potato"],
  "bath soap": ["soap", "sabun"],
  shampoo: ["shampoo"],
};

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function matchVoiceLine(
  line: VoiceLine,
  items: MatchableItem[],
): { item: MatchableItem; score: number } | null {
  const query = normalise(line.query);
  if (!query) return null;
  let best: { item: MatchableItem; score: number } | null = null;

  for (const item of items) {
    const name = normalise(item.name);
    const aliases = ALIASES[name] || [];
    let score = 0;
    if (name === query) score = 100;
    else if (name.includes(query)) score = 86;
    else if (query.includes(name) && name.length > 2) score = 80;
    else if (aliases.some((alias) => query === alias || query.includes(alias))) score = 84;
    else {
      const tokens = query.split(" ").filter((token) => token.length > 2);
      const hits = tokens.filter((token) => name.includes(token) || aliases.some((alias) => alias.includes(token)));
      if (hits.length) score = 60 + hits.length * 8;
    }
    if (line.unit && item.unit.toLowerCase() === line.unit.toLowerCase()) score += 3;
    if (!best || score > best.score) best = { item, score };
  }

  if (!best || best.score < 68) return null;
  return best;
}
