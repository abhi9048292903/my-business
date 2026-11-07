import { rupeesToPaise } from "./money";

export type SeedCategory = {
  id: string;
  name: string;
  sort_order: number;
};

export type SeedItem = {
  id: string;
  name: string;
  barcode?: string;
  categoryId: string;
  unit: string;
  price: number;
  gst: number;
  stock?: number;
  low?: number;
  trackStock?: number;
  itemType?: "product" | "service";
  skills?: string;
  serviceType?: string;
};

export const SEED_GROCERY_CATEGORIES: SeedCategory[] = [
  { id: "cat_staples", name: "Staples", sort_order: 1 },
  { id: "cat_dairy", name: "Dairy", sort_order: 2 },
  { id: "cat_snacks", name: "Snacks", sort_order: 3 },
  { id: "cat_produce", name: "Produce", sort_order: 4 },
  { id: "cat_personal", name: "Personal", sort_order: 5 },
];

export const SEED_GROCERY_ITEMS: SeedItem[] = [
  { id: "item_sugar", name: "Sugar", barcode: "8901001000011", categoryId: "cat_staples", unit: "kg", price: 52, gst: 5, stock: 40, low: 8, trackStock: 1, itemType: "product" },
  { id: "item_rice", name: "Rice", barcode: "8901001000035", categoryId: "cat_staples", unit: "kg", price: 68, gst: 5, stock: 50, low: 10, trackStock: 1, itemType: "product" },
  { id: "item_atta", name: "Wheat Flour", barcode: "8901001000042", categoryId: "cat_staples", unit: "kg", price: 46, gst: 5, stock: 35, low: 8, trackStock: 1, itemType: "product" },
  { id: "item_dal", name: "Toor Dal", barcode: "8901001000059", categoryId: "cat_staples", unit: "kg", price: 164, gst: 5, stock: 20, low: 5, trackStock: 1, itemType: "product" },
  { id: "item_oil", name: "Cooking Oil", barcode: "8901001000066", categoryId: "cat_staples", unit: "L", price: 145, gst: 5, stock: 15, low: 4, trackStock: 1, itemType: "product" },
  { id: "item_salt", name: "Salt", barcode: "8901001000073", categoryId: "cat_staples", unit: "pack", price: 28, gst: 5, stock: 30, low: 6, trackStock: 1, itemType: "product" },
  { id: "item_tea", name: "Tea", barcode: "8901001000080", categoryId: "cat_staples", unit: "pack", price: 145, gst: 5, stock: 18, low: 4, trackStock: 1, itemType: "product" },
  { id: "item_milk", name: "Milk", barcode: "8901001000028", categoryId: "cat_dairy", unit: "L", price: 58, gst: 0, stock: 24, low: 6, trackStock: 1, itemType: "product" },
  { id: "item_bread", name: "Bread", barcode: "8901001000097", categoryId: "cat_dairy", unit: "pack", price: 45, gst: 0, stock: 12, low: 4, trackStock: 1, itemType: "product" },
  { id: "item_curd", name: "Curd", barcode: "8901001000103", categoryId: "cat_dairy", unit: "pack", price: 30, gst: 5, stock: 16, low: 4, trackStock: 1, itemType: "product" },
  { id: "item_eggs", name: "Eggs", barcode: "8901001000110", categoryId: "cat_dairy", unit: "dozen", price: 90, gst: 0, stock: 10, low: 4, trackStock: 1, itemType: "product" },
  { id: "item_biscuits", name: "Biscuits", barcode: "8901001000127", categoryId: "cat_snacks", unit: "pack", price: 30, gst: 18, stock: 40, low: 8, trackStock: 1, itemType: "product" },
  { id: "item_noodles", name: "Instant Noodles", barcode: "8901001000134", categoryId: "cat_snacks", unit: "pack", price: 14, gst: 12, stock: 48, low: 12, trackStock: 1, itemType: "product" },
  { id: "item_cola", name: "Cola", barcode: "8901001000141", categoryId: "cat_snacks", unit: "pcs", price: 40, gst: 28, stock: 24, low: 6, trackStock: 1, itemType: "product" },
  { id: "item_onion", name: "Onion", barcode: "8901001000158", categoryId: "cat_produce", unit: "kg", price: 35, gst: 0, stock: 25, low: 5, trackStock: 1, itemType: "product" },
  { id: "item_tomato", name: "Tomato", barcode: "8901001000165", categoryId: "cat_produce", unit: "kg", price: 42, gst: 0, stock: 18, low: 5, trackStock: 1, itemType: "product" },
  { id: "item_potato", name: "Potato", barcode: "8901001000172", categoryId: "cat_produce", unit: "kg", price: 30, gst: 0, stock: 40, low: 8, trackStock: 1, itemType: "product" },
  { id: "item_soap", name: "Bath Soap", barcode: "8901001000189", categoryId: "cat_personal", unit: "pcs", price: 35, gst: 18, stock: 3, low: 6, trackStock: 1, itemType: "product" },
  { id: "item_shampoo", name: "Shampoo", barcode: "8901001000196", categoryId: "cat_personal", unit: "pcs", price: 99, gst: 18, stock: 12, low: 4, trackStock: 1, itemType: "product" },
];

export const SEED_FREELANCE_CATEGORIES: SeedCategory[] = [
  { id: "cat_fl_dev", name: "Development & Engineering", sort_order: 1 },
  { id: "cat_fl_design", name: "UI/UX & Product Design", sort_order: 2 },
  { id: "cat_fl_consulting", name: "Architecture & Consulting", sort_order: 3 },
  { id: "cat_fl_growth", name: "Growth, SEO & Content", sort_order: 4 },
];

export const SEED_FREELANCE_ITEMS: SeedItem[] = [
  {
    id: "fl_web_dev",
    name: "Full-Stack Web Development",
    categoryId: "cat_fl_dev",
    unit: "hr",
    price: 2500,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "freelance",
    skills: "Next.js, React, Node.js, TypeScript, PostgreSQL",
  },
  {
    id: "fl_mobile_app",
    name: "Mobile App Feature Build",
    categoryId: "cat_fl_dev",
    unit: "day",
    price: 16000,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "freelance",
    skills: "React Native, Expo, iOS & Android Deployment",
  },
  {
    id: "fl_api_integrations",
    name: "API & Payment Integration Sprint",
    categoryId: "cat_fl_dev",
    unit: "project",
    price: 35000,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "freelance",
    skills: "Stripe, Razorpay, UPI Webhooks, REST/GraphQL",
  },
  {
    id: "fl_ui_design_sprint",
    name: "UI/UX Design Sprint & Wireframes",
    categoryId: "cat_fl_design",
    unit: "project",
    price: 45000,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "freelance",
    skills: "Figma, User Flows, High-Fidelity Prototypes",
  },
  {
    id: "fl_design_system",
    name: "Design System & Component Library",
    categoryId: "cat_fl_design",
    unit: "project",
    price: 30000,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "freelance",
    skills: "Tokens, Responsive Components, Tailwind/CSS",
  },
  {
    id: "fl_cloud_audit",
    name: "Cloud Architecture & DevOps Audit",
    categoryId: "cat_fl_consulting",
    unit: "project",
    price: 40000,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "freelance",
    skills: "AWS, Docker, CI/CD, Terraform, Security",
  },
  {
    id: "fl_code_review",
    name: "Technical Code Review & Mentorship",
    categoryId: "cat_fl_consulting",
    unit: "hr",
    price: 3200,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "freelance",
    skills: "Code Quality, Architecture Review, Refactoring",
  },
  {
    id: "fl_seo_perf",
    name: "Core Web Vitals & Speed Optimization",
    categoryId: "cat_fl_growth",
    unit: "project",
    price: 22000,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "freelance",
    skills: "Lighthouse 95+, Bundle Splitting, Technical SEO",
  },
  {
    id: "fl_tech_docs",
    name: "Technical Writing & API Docs",
    categoryId: "cat_fl_growth",
    unit: "project",
    price: 18000,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "freelance",
    skills: "OpenAPI, Markdown, SDK Docs, Architecture Guides",
  },
];

export const SEED_STAFFING_CATEGORIES: SeedCategory[] = [
  { id: "cat_hr_engineering", name: "Software & Engineering Staffing", sort_order: 1 },
  { id: "cat_hr_cloud_data", name: "Cloud, DevOps & Data Talent", sort_order: 2 },
  { id: "cat_hr_design_product", name: "Product & UI/UX Specialists", sort_order: 3 },
  { id: "cat_hr_tech_trades", name: "Skilled Technicians & Operations", sort_order: 4 },
];

export const SEED_STAFFING_ITEMS: SeedItem[] = [
  {
    id: "hr_senior_frontend",
    name: "Senior Frontend Engineer (Dedicated Placement)",
    categoryId: "cat_hr_engineering",
    unit: "month",
    price: 125000,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "staffing",
    skills: "React, Next.js, TypeScript, Tailwind, State Management",
  },
  {
    id: "hr_backend_engineer",
    name: "Backend Cloud Engineer (Dedicated Placement)",
    categoryId: "cat_hr_engineering",
    unit: "month",
    price: 115000,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "staffing",
    skills: "Node.js, Python, PostgreSQL, Microservices, Redis",
  },
  {
    id: "hr_contract_developer",
    name: "Full-Stack Engineer (Short-term Contractor)",
    categoryId: "cat_hr_engineering",
    unit: "day",
    price: 6500,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "staffing",
    skills: "React, Express, API Integration, Bug Resolution",
  },
  {
    id: "hr_qa_automation",
    name: "QA Automation Specialist (Dedicated Resource)",
    categoryId: "cat_hr_engineering",
    unit: "month",
    price: 85000,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "staffing",
    skills: "Playwright, Cypress, Jest, CI Test Automation",
  },
  {
    id: "hr_devops_sre",
    name: "DevOps & SRE Specialist (Dedicated Placement)",
    categoryId: "cat_hr_cloud_data",
    unit: "month",
    price: 145000,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "staffing",
    skills: "Kubernetes, AWS, Terraform, Docker, Monitoring",
  },
  {
    id: "hr_data_analyst",
    name: "Data Analyst & BI Specialist",
    categoryId: "cat_hr_cloud_data",
    unit: "month",
    price: 90000,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "staffing",
    skills: "SQL, Python, PowerBI, Tableau, ETL Pipelines",
  },
  {
    id: "hr_product_designer",
    name: "Product / UX Designer (Dedicated Resource)",
    categoryId: "cat_hr_design_product",
    unit: "month",
    price: 98000,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "staffing",
    skills: "Figma, User Journey Mapping, Design Systems",
  },
  {
    id: "hr_tech_lead",
    name: "Technical Project Manager / Scrum Master",
    categoryId: "cat_hr_design_product",
    unit: "month",
    price: 110000,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "staffing",
    skills: "Agile, Jira, Sprint Planning, Stakeholder Delivery",
  },
  {
    id: "hr_certified_electrician",
    name: "Industrial & Data Center Electrician",
    categoryId: "cat_hr_tech_trades",
    unit: "day",
    price: 3500,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "staffing",
    skills: "Certified 3-Phase Wiring, Server Rack UPS, Fault Isolation",
  },
  {
    id: "hr_it_hardware_tech",
    name: "IT Infrastructure & Network Technician",
    categoryId: "cat_hr_tech_trades",
    unit: "day",
    price: 3200,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "staffing",
    skills: "Cisco Routing, Fiber Termination, Hardware Diagnostics",
  },
  {
    id: "hr_data_entry_ops",
    name: "Data Entry & Catalog Operations Associate",
    categoryId: "cat_hr_tech_trades",
    unit: "month",
    price: 42000,
    gst: 18,
    stock: 0,
    low: 0,
    trackStock: 0,
    itemType: "service",
    serviceType: "staffing",
    skills: "Speed Typing, Excel Mastery, CRM Verification",
  },
];

// Backward-compatible exports
export const SEED_CATEGORIES = SEED_GROCERY_CATEGORIES;
export const SEED_ITEMS = SEED_GROCERY_ITEMS;

export function getCatalogPreset(businessType = "retail"): {
  categories: SeedCategory[];
  items: SeedItem[];
} {
  const norm = businessType.toLowerCase().trim();
  if (norm === "freelance" || norm === "freelancer") {
    return { categories: SEED_FREELANCE_CATEGORIES, items: SEED_FREELANCE_ITEMS };
  }
  if (norm === "staffing" || norm === "hr" || norm === "human_resources") {
    return { categories: SEED_STAFFING_CATEGORIES, items: SEED_STAFFING_ITEMS };
  }
  if (norm === "hybrid") {
    return {
      categories: [
        ...SEED_FREELANCE_CATEGORIES,
        ...SEED_STAFFING_CATEGORIES,
        ...SEED_GROCERY_CATEGORIES.slice(0, 2),
      ],
      items: [
        ...SEED_FREELANCE_ITEMS.slice(0, 4),
        ...SEED_STAFFING_ITEMS.slice(0, 4),
        ...SEED_GROCERY_ITEMS.slice(0, 4),
      ],
    };
  }
  return { categories: SEED_GROCERY_CATEGORIES, items: SEED_GROCERY_ITEMS };
}

export function seedPrice(price: number): number {
  return rupeesToPaise(price);
}
