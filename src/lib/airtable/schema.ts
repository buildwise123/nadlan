/**
 * The Airtable data model as code (spec chapter 3, plus D-17 and D-18).
 *
 * Only field types the Airtable API can create are used. Values that the spec
 * describes as formulas or lookups (e.g. Name, Base Cap Rate) are plain fields
 * that our code fills in, so the model is fully reproducible.
 *
 * Links are declared only on the "child" side; Airtable creates the reverse
 * link field automatically.
 */
import type { FieldSpec } from "./client";

const text = (name: string, description?: string): FieldSpec => ({ name, type: "singleLineText", description });
const longText = (name: string, description?: string): FieldSpec => ({ name, type: "multilineText", description });
const num = (name: string, precision = 0): FieldSpec => ({ name, type: "number", options: { precision } });
const money = (name: string): FieldSpec => ({ name, type: "currency", options: { precision: 0, symbol: "$" } });
const pct = (name: string, precision = 2): FieldSpec => ({ name, type: "percent", options: { precision } });
const check = (name: string): FieldSpec => ({ name, type: "checkbox", options: { icon: "check", color: "greenBright" } });
const url = (name: string): FieldSpec => ({ name, type: "url" });
const date = (name: string): FieldSpec => ({ name, type: "date", options: { dateFormat: { name: "iso" } } });
const dateTime = (name: string): FieldSpec => ({
  name,
  type: "dateTime",
  options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "utc" },
});
const select = (name: string, choices: string[]): FieldSpec => ({
  name,
  type: "singleSelect",
  options: { choices: choices.map((c) => ({ name: c })) },
});

export type LinkSpec = { name: string; to: TableName };
export type TableSpec = { name: TableName; description: string; fields: FieldSpec[]; links: LinkSpec[] };

export const TABLE_NAMES = [
  "Properties",
  "Sources",
  "Sync Runs",
  "Listings",
  "Listing Events",
  "Data Points",
  "Comparable Sales",
  "Schools",
  "Property Schools",
  "Scenarios",
  "Defaults",
  "Compare Sets",
] as const;
export type TableName = (typeof TABLE_NAMES)[number];

const RELIABILITY = ["High", "Medium", "Low"];
const SCENARIOS = ["Conservative", "Base", "Optimistic"];

export const SCHEMA: TableSpec[] = [
  {
    name: "Properties",
    description: "נכס פיזי אחד (חלקה). מפתח כפילויות: Tax Key, ואחריו Address Normalized.",
    fields: [
      text("Name", "כתובת לתצוגה, ממולאת על ידי המערכת"),
      text("Tax Key"),
      text("Address Normalized"),
      text("Address Raw"),
      text("ZIP"),
      num("Latitude", 6),
      num("Longitude", 6),
      text("Census Tract GEOID"),
      text("Neighborhood"),
      text("Assessor Nbhd"),
      select("Property Type", ["Single Family", "Duplex", "Triplex", "Fourplex"]),
      num("Units"),
      num("Beds"),
      num("Baths", 1),
      num("Sqft"),
      num("Lot Sqft"),
      num("Year Built"),
      money("Assessed Value"),
      money("Est Annual Tax"),
      text("Flood Zone"),
      check("Vacant Building"),
      check("Tax Delinquent"),
      text("Tax Delinquent Years"),
      money("Tax Delinquent Amount"),
      money("Current List Price"),
      select("Listing Status", ["Active", "Pending", "Sold", "Withdrawn", "Off-Market"]),
      select("Pipeline Stage", ["New", "Reviewing", "Analyzing", "Offer", "Rejected", "Archived"]),
      longText("My Notes"),
      select("Enrichment Status", ["Pending", "Partial", "Complete", "Failed"]),
      pct("Base Cap Rate"),
      money("Base Cash Flow"),
      pct("Base CoC"),
      num("Risk Score", 1),
      select("Created Via", ["Manual", "RentCast"]),
    ],
    links: [],
  },
  {
    name: "Sources",
    description: "קטלוג מקורות הנתונים, הרישיון ותנאי השימוש.",
    fields: [
      text("Name"),
      text("Organization"),
      url("URL"),
      text("License"),
      select("Access Method", ["API", "File", "GIS", "Manual"]),
      text("Update Frequency"),
      select("Default Reliability", RELIABILITY),
      date("Terms Checked On"),
      longText("Terms Notes"),
      check("API Key Required"),
    ],
    links: [],
  },
  {
    name: "Sync Runs",
    description: "לוג של כל ריצה (ייבוא, העשרה, הקמה) ושגיאותיה.",
    fields: [
      text("Name"),
      select("Job Type", ["rentcast-import", "enrichment", "city-refresh", "schools-import", "airtable-setup", "manual"]),
      select("Trigger", ["Apify Schedule", "Manual", "Setup"]),
      dateTime("Started At"),
      dateTime("Finished At"),
      select("Status", ["Running", "Success", "Partial", "Failed"]),
      num("Records Read"),
      num("Records Created"),
      num("Records Updated"),
      num("Records Skipped"),
      num("Error Count"),
      longText("Error Details"),
      longText("Calls Used"),
    ],
    links: [],
  },
  {
    name: "Listings",
    description: "הצעת מכירה של נכס במקור מסוים.",
    fields: [
      text("Name"),
      text("Source Listing ID"),
      url("Listing URL"),
      money("List Price"),
      select("Status", ["Active", "Pending", "Sold", "Withdrawn", "Off-Market"]),
      date("First Seen"),
      date("Last Seen"),
      num("Days on Market"),
      check("Is Active"),
    ],
    links: [
      { name: "Property", to: "Properties" },
      { name: "Source", to: "Sources" },
    ],
  },
  {
    name: "Listing Events",
    description: "שינוי מחיר או סטטוס, עם תאריך.",
    fields: [
      text("Name"),
      dateTime("Event Date"),
      select("Event Type", ["New", "Price Change", "Status Change"]),
      text("Old Value"),
      text("New Value"),
    ],
    links: [
      { name: "Listing", to: "Listings" },
      { name: "Detected By", to: "Sync Runs" },
    ],
  },
  {
    name: "Data Points",
    description: "נתון בודד עם Provenance מלא: מקור, תאריכים, דיוק, אמינות, ידני או חיצוני.",
    fields: [
      text("Name"),
      text("Metric Key"),
      select("Category", ["Property", "Demographics", "Crime", "Schools", "Comps", "Tax", "Flood", "Rent", "City"]),
      num("Value Number", 4),
      text("Value Text"),
      text("Unit"),
      select("Origin", ["External", "Manual"]),
      longText("Source Reference"),
      dateTime("Collected At"),
      dateTime("Last Verified At"),
      date("Period Start"),
      date("Period End"),
      select("Geo Level", ["Parcel", "Radius 0.5mi", "Tract", "Neighborhood", "ZIP", "City"]),
      select("Accuracy", ["Exact", "Aggregated", "Estimate with MOE", "Vendor Model"]),
      num("Margin of Error", 4),
      select("Reliability", RELIABILITY),
      check("Is Current"),
      select("Status", ["OK", "Missing", "Failed"]),
    ],
    links: [
      { name: "Property", to: "Properties" },
      { name: "Source", to: "Sources" },
      { name: "Sync Run", to: "Sync Runs" },
    ],
  },
  {
    name: "Comparable Sales",
    description: "עסקת השוואה לנכס נבחן, מנתוני המכירות של העירייה.",
    fields: [
      text("Name"),
      text("Comp Tax Key"),
      text("Comp Address"),
      date("Sale Date"),
      money("Sale Price"),
      num("Sqft"),
      num("Beds"),
      num("Baths", 1),
      text("Style"),
      num("Year Built"),
      num("Distance (mi)", 2),
      money("Price per Sqft"),
      check("Included"),
    ],
    links: [
      { name: "Subject Property", to: "Properties" },
      { name: "Source", to: "Sources" },
    ],
  },
  {
    name: "Schools",
    description: "בית ספר ודירוג Report Card של DPI לשנה מסוימת.",
    fields: [
      text("Name"),
      text("DPI School Code"),
      text("District"),
      select("School Type", ["Public", "Charter", "Choice", "Other"]),
      text("Grades"),
      text("Address"),
      num("Latitude", 6),
      num("Longitude", 6),
      num("Report Card Score", 1),
      text("Rating Category"),
      text("School Year"),
    ],
    links: [{ name: "Source", to: "Sources" }],
  },
  {
    name: "Property Schools",
    description: "בית ספר קרוב לנכס, עם מרחק.",
    fields: [text("Name"), num("Distance (mi)", 2), num("Rank")],
    links: [
      { name: "Property", to: "Properties" },
      { name: "School", to: "Schools" },
    ],
  },
  {
    name: "Scenarios",
    description: "הנחות ותוצאות ניתוח השקעה לתרחיש אחד (פרק 6).",
    fields: [
      text("Name"),
      select("Scenario Type", SCENARIOS),
      money("Purchase Price"),
      pct("Closing Cost %"),
      money("Rehab Cost"),
      money("Monthly Rent Total"),
      longText("Rent Detail"),
      money("Other Income"),
      pct("Vacancy %"),
      money("Property Tax"),
      money("Insurance"),
      money("Owner Utilities"),
      pct("Management %"),
      pct("Maintenance %"),
      pct("CapEx %"),
      money("Other Expenses"),
      pct("Down Payment %"),
      pct("Interest Rate %", 3),
      num("Loan Term Years"),
      money("GPR"),
      money("EGI"),
      money("OpEx"),
      money("NOI"),
      pct("Cap Rate"),
      pct("All-in Cap Rate"),
      money("Monthly Payment"),
      money("Annual Debt Service"),
      money("Annual Cash Flow"),
      money("Cash Invested"),
      pct("CoC"),
      num("DSCR", 2),
      num("GRM", 2),
      longText("Assumption Origins"),
      text("Formula Version"),
      dateTime("Calculated At"),
    ],
    links: [{ name: "Property", to: "Properties" }],
  },
  {
    name: "Defaults",
    description: "הנחות ברירת מחדל לכל תרחיש, עם מקור ותאריך תוקף.",
    fields: [
      text("Name"),
      select("Scenario Type", [...SCENARIOS, "All"]),
      num("Value", 4),
      text("Unit"),
      date("Effective From"),
      longText("Notes"),
    ],
    links: [{ name: "Source", to: "Sources" }],
  },
  {
    name: "Compare Sets",
    description: "קבוצת השוואה שמורה של 2–5 נכסים.",
    fields: [text("Name"), longText("Notes")],
    links: [{ name: "Properties", to: "Properties" }],
  },
];
