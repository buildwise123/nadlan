/**
 * DEMO DATA for the dashboard mockup. Everything here is invented:
 * addresses, prices, rents, run results. It exists only to give a feel for
 * the screen, and is shown under a clear "demo" banner. Replace with Airtable
 * data in phase 6.
 */

export type Stage = "New" | "Reviewing" | "Analyzing" | "Offer" | "Rejected";
export type PropertyType = "Single Family" | "Duplex" | "Triplex" | "Fourplex";

type Seed = {
  id: string;
  address: string;
  neighborhood: string;
  type: PropertyType;
  units: number;
  price: number;
  rentPerUnit: number;
  stage: Stage;
  daysListed: number;
  risk: number; // 1 (low) – 10 (high), demo only
};

export type DemoProperty = Seed & {
  noi: number;
  capRate: number;
  cashFlowMonthly: number;
  coc: number;
};

/** Demo-only assumptions, so the numbers on screen hang together. Not the user's defaults. */
const DEMO = { vacancy: 0.08, opexShare: 0.21, taxRate: 0.02293, insuranceBase: 1200, insurancePerUnit: 300, down: 0.25, closing: 0.03, rate: 0.0718, years: 30 };

function analyze(seed: Seed): DemoProperty {
  const gpr = seed.rentPerUnit * seed.units * 12;
  const egi = gpr * (1 - DEMO.vacancy);
  const opex = seed.price * DEMO.taxRate + DEMO.insuranceBase + DEMO.insurancePerUnit * seed.units + egi * DEMO.opexShare;
  const noi = egi - opex;
  const loan = seed.price * (1 - DEMO.down);
  const r = DEMO.rate / 12;
  const n = DEMO.years * 12;
  const debtService = 12 * ((loan * r) / (1 - (1 + r) ** -n));
  const cashFlow = noi - debtService;
  const invested = seed.price * (DEMO.down + DEMO.closing);
  return { ...seed, noi, capRate: noi / seed.price, cashFlowMonthly: cashFlow / 12, coc: cashFlow / invested };
}

const SEEDS: Seed[] = [
  { id: "p01", address: "2714 S Demo Ave", neighborhood: "Bay View", type: "Duplex", units: 2, price: 229900, rentPerUnit: 1350, stage: "Analyzing", daysListed: 12, risk: 3 },
  { id: "p02", address: "3158 N Sample St", neighborhood: "Riverwest", type: "Duplex", units: 2, price: 189000, rentPerUnit: 1250, stage: "Reviewing", daysListed: 4, risk: 4 },
  { id: "p03", address: "4420 W Example Pl", neighborhood: "Washington Heights", type: "Single Family", units: 1, price: 214500, rentPerUnit: 1650, stage: "New", daysListed: 2, risk: 2 },
  { id: "p04", address: "2931 N Mockup Blvd", neighborhood: "Sherman Park", type: "Duplex", units: 2, price: 134900, rentPerUnit: 1100, stage: "Offer", daysListed: 21, risk: 6 },
  { id: "p05", address: "1847 S Placeholder St", neighborhood: "Walker's Point", type: "Triplex", units: 3, price: 279000, rentPerUnit: 1200, stage: "Analyzing", daysListed: 9, risk: 4 },
  { id: "p06", address: "3605 N Testing Ln", neighborhood: "Harambee", type: "Duplex", units: 2, price: 119500, rentPerUnit: 1050, stage: "Reviewing", daysListed: 6, risk: 7 },
  { id: "p07", address: "5212 W Fictional Rd", neighborhood: "Story Hill", type: "Single Family", units: 1, price: 289000, rentPerUnit: 1900, stage: "Rejected", daysListed: 30, risk: 2 },
  { id: "p08", address: "2268 S Sandbox Ave", neighborhood: "Bay View", type: "Fourplex", units: 4, price: 349000, rentPerUnit: 1100, stage: "Analyzing", daysListed: 15, risk: 3 },
  { id: "p09", address: "4031 N Draft St", neighborhood: "Sherman Park", type: "Duplex", units: 2, price: 149900, rentPerUnit: 1150, stage: "New", daysListed: 1, risk: 5 },
  { id: "p10", address: "1530 W Prototype Ct", neighborhood: "Clarke Square", type: "Duplex", units: 2, price: 159000, rentPerUnit: 1125, stage: "Reviewing", daysListed: 8, risk: 6 },
  { id: "p11", address: "2809 N Example Ave", neighborhood: "Riverwest", type: "Triplex", units: 3, price: 254900, rentPerUnit: 1175, stage: "New", daysListed: 3, risk: 4 },
  { id: "p12", address: "6120 W Sample Pkwy", neighborhood: "Enderis Park", type: "Single Family", units: 1, price: 239000, rentPerUnit: 1750, stage: "Reviewing", daysListed: 11, risk: 2 },
  { id: "p13", address: "3377 S Demo Pl", neighborhood: "Tippecanoe", type: "Single Family", units: 1, price: 199900, rentPerUnit: 1550, stage: "Analyzing", daysListed: 17, risk: 2 },
  { id: "p14", address: "2455 N Mockup St", neighborhood: "Harambee", type: "Duplex", units: 2, price: 99900, rentPerUnit: 975, stage: "Rejected", daysListed: 40, risk: 8 },
  { id: "p15", address: "1712 S Placeholder Ave", neighborhood: "Lincoln Village", type: "Duplex", units: 2, price: 174500, rentPerUnit: 1175, stage: "New", daysListed: 5, risk: 5 },
  { id: "p16", address: "3940 N Testing Ave", neighborhood: "Sherman Park", type: "Fourplex", units: 4, price: 269000, rentPerUnit: 1000, stage: "Reviewing", daysListed: 13, risk: 6 },
  { id: "p17", address: "5005 W Fictional St", neighborhood: "Washington Heights", type: "Duplex", units: 2, price: 264000, rentPerUnit: 1450, stage: "Reviewing", daysListed: 7, risk: 3 },
  { id: "p18", address: "2120 S Sandbox Pl", neighborhood: "Bay View", type: "Single Family", units: 1, price: 259900, rentPerUnit: 1800, stage: "New", daysListed: 6, risk: 2 },
  { id: "p19", address: "3222 N Draft Ave", neighborhood: "Riverwest", type: "Duplex", units: 2, price: 209000, rentPerUnit: 1300, stage: "Analyzing", daysListed: 10, risk: 4 },
  { id: "p20", address: "1430 W Prototype St", neighborhood: "Muskego Way", type: "Triplex", units: 3, price: 189900, rentPerUnit: 1050, stage: "Reviewing", daysListed: 14, risk: 6 },
];

export const PROPERTIES: DemoProperty[] = SEEDS.map(analyze);

export const STAGES: { stage: Stage; label: string }[] = [
  { stage: "New", label: "חדש" },
  { stage: "Reviewing", label: "בבדיקה" },
  { stage: "Analyzing", label: "בניתוח" },
  { stage: "Offer", label: "הצעה" },
  { stage: "Rejected", label: "נדחה" },
];

export const PRICE_CHANGES = [
  { propertyId: "p05", date: "2026-11-15", oldPrice: 289000, newPrice: 279000 },
  { propertyId: "p16", date: "2026-11-14", oldPrice: 279900, newPrice: 269000 },
  { propertyId: "p10", date: "2026-11-12", oldPrice: 165000, newPrice: 159000 },
  { propertyId: "p17", date: "2026-11-10", oldPrice: 259000, newPrice: 264000 },
];

export const SOURCE_RUNS = [
  { source: "RentCast (ייבוא שבועי)", finishedAt: "2026-11-15 06:04", status: "Success" as const, detail: "5 נכסים חדשים, 3 שינויי מחיר · 2 קריאות API" },
  { source: "עירייה: MPROP ומכירות", finishedAt: "2026-11-15 06:09", status: "Success" as const, detail: "20 נכסים עודכנו" },
  { source: "Census ACS", finishedAt: "2026-11-01 05:30", status: "Partial" as const, detail: "2 כתובות לא אותרו" },
  { source: "FEMA (הצפות)", finishedAt: "2026-11-01 05:31", status: "Failed" as const, detail: "השירות לא הגיב, ניסיון חוזר בריצה הבאה" },
];

export const DATA_AS_OF = "2026-11-16 07:00";
export const DEMO_THRESHOLDS = { newWithinDays: 7 };

// ---------- derived views ----------

export const byId = (id: string) => PROPERTIES.find((p) => p.id === id)!;

export const active = () => PROPERTIES.filter((p) => p.stage !== "Rejected");

export const topByCoc = (n = 10) => [...active()].sort((a, b) => b.coc - a.coc).slice(0, n);

export const newThisWeek = () =>
  PROPERTIES.filter((p) => p.daysListed <= DEMO_THRESHOLDS.newWithinDays).sort((a, b) => a.daysListed - b.daysListed);

export const stageCounts = () => STAGES.map((s) => ({ ...s, count: PROPERTIES.filter((p) => p.stage === s.stage).length }));
