import { rupeesToPaise } from "./money";

export type SeedItem = {
  id: string;
  name: string;
  barcode: string;
  categoryId: string;
  unit: string;
  price: number;
  gst: number;
  stock: number;
  low: number;
};

export const SEED_CATEGORIES = [
  { id: "cat_staples", name: "Staples", sort_order: 1 },
  { id: "cat_dairy", name: "Dairy", sort_order: 2 },
  { id: "cat_snacks", name: "Snacks", sort_order: 3 },
  { id: "cat_produce", name: "Produce", sort_order: 4 },
  { id: "cat_personal", name: "Personal", sort_order: 5 },
];

export const SEED_ITEMS: SeedItem[] = [
  { id: "item_sugar", name: "Sugar", barcode: "8901001000011", categoryId: "cat_staples", unit: "kg", price: 52, gst: 5, stock: 40, low: 8 },
  { id: "item_rice", name: "Rice", barcode: "8901001000035", categoryId: "cat_staples", unit: "kg", price: 68, gst: 5, stock: 50, low: 10 },
  { id: "item_atta", name: "Wheat Flour", barcode: "8901001000042", categoryId: "cat_staples", unit: "kg", price: 46, gst: 5, stock: 35, low: 8 },
  { id: "item_dal", name: "Toor Dal", barcode: "8901001000059", categoryId: "cat_staples", unit: "kg", price: 164, gst: 5, stock: 20, low: 5 },
  { id: "item_oil", name: "Cooking Oil", barcode: "8901001000066", categoryId: "cat_staples", unit: "L", price: 145, gst: 5, stock: 15, low: 4 },
  { id: "item_salt", name: "Salt", barcode: "8901001000073", categoryId: "cat_staples", unit: "pack", price: 28, gst: 5, stock: 30, low: 6 },
  { id: "item_tea", name: "Tea", barcode: "8901001000080", categoryId: "cat_staples", unit: "pack", price: 145, gst: 5, stock: 18, low: 4 },
  { id: "item_milk", name: "Milk", barcode: "8901001000028", categoryId: "cat_dairy", unit: "L", price: 58, gst: 0, stock: 24, low: 6 },
  { id: "item_bread", name: "Bread", barcode: "8901001000097", categoryId: "cat_dairy", unit: "pack", price: 45, gst: 0, stock: 12, low: 4 },
  { id: "item_curd", name: "Curd", barcode: "8901001000103", categoryId: "cat_dairy", unit: "pack", price: 30, gst: 5, stock: 16, low: 4 },
  { id: "item_eggs", name: "Eggs", barcode: "8901001000110", categoryId: "cat_dairy", unit: "dozen", price: 90, gst: 0, stock: 10, low: 4 },
  { id: "item_biscuits", name: "Biscuits", barcode: "8901001000127", categoryId: "cat_snacks", unit: "pack", price: 30, gst: 18, stock: 40, low: 8 },
  { id: "item_noodles", name: "Instant Noodles", barcode: "8901001000134", categoryId: "cat_snacks", unit: "pack", price: 14, gst: 12, stock: 48, low: 12 },
  { id: "item_cola", name: "Cola", barcode: "8901001000141", categoryId: "cat_snacks", unit: "pcs", price: 40, gst: 28, stock: 24, low: 6 },
  { id: "item_onion", name: "Onion", barcode: "8901001000158", categoryId: "cat_produce", unit: "kg", price: 35, gst: 0, stock: 25, low: 5 },
  { id: "item_tomato", name: "Tomato", barcode: "8901001000165", categoryId: "cat_produce", unit: "kg", price: 42, gst: 0, stock: 18, low: 5 },
  { id: "item_potato", name: "Potato", barcode: "8901001000172", categoryId: "cat_produce", unit: "kg", price: 30, gst: 0, stock: 40, low: 8 },
  { id: "item_soap", name: "Bath Soap", barcode: "8901001000189", categoryId: "cat_personal", unit: "pcs", price: 35, gst: 18, stock: 3, low: 6 },
  { id: "item_shampoo", name: "Shampoo", barcode: "8901001000196", categoryId: "cat_personal", unit: "pcs", price: 99, gst: 18, stock: 12, low: 4 },
];

export function seedPrice(price: number): number {
  return rupeesToPaise(price);
}
