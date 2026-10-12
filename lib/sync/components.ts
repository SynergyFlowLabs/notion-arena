/**
 * The ten bound components.
 *
 * Ten, chosen the way a test suite is chosen rather than the way a catalog is
 * built: every state *shape* the other 182 widgets use is represented at least
 * once, and every Notion property type the mapping layer can write appears in a
 * column that a person would actually want.
 *
 *   shape                    component
 *   ─────────────────────    ────────────────────────────────────────────────
 *   nested map               habit-grid          `{habit: {date: level}}`
 *   array of flat records    expense-tracker     title, number, date, select
 *   array with a checkbox    chore-checklist     the boolean case
 *   array with a url         bookmark-library    Notion's `url` property
 *   array with long text     daily-journal       3,000 characters in one cell
 *   keyed document           grocery-list        state-blob mode, one row
 *   SPEC list + number       invoice-tracker     the 84-widget family
 *   SPEC list + selects      equipment-inventory options carried into Notion
 *   SPEC list + checklist    incident-log        `checks` -> multi_select
 *
 * This module is imported by the docs page and by the playground, so it stays
 * free of `node:fs`: labels, blurbs and seed documents only. The schemas those
 * seeds flow through live in `lib/sync/schemas.ts`, server-side.
 */

export type BoundMode = "records" | "kv-blob";

export interface BoundComponent {
  slug: string;
  /** display name, matching the catalog */
  label: string;
  mode: BoundMode;
  /** what one row is called, straight from the schema */
  itemLabel: string;
  /** one line: why this one is in the ten */
  blurb: string;
  /** the shortest path to seeing the loop work */
  tryThis: string;
  /**
   * The document the widget already has, uploaded at bind time through the
   * ordinary push path. It is the widget's own state, never a table we invented
   * on the side.
   */
  seed: unknown;
}

export const BOUND_COMPONENTS: BoundComponent[] = [
  {
    slug: "habit-grid",
    label: "Habit Heatmap",
    mode: "records",
    itemLabel: "habit tick",
    blurb:
      "State is {habit: {date: level}}, so inference cannot read it. Declared, and the key is the habit and the day: two ticks in one cell are one row, which is what the grid already means.",
    tryThis: "Click a cell in the offline pane, then send its sync code to the live pane and watch one row appear.",
    seed: {
      water: { "2026-10-09": 1, "2026-10-10": 2, "2026-10-11": 2 },
      read: { "2026-10-09": 1, "2026-10-11": 1 },
    },
  },
  {
    slug: "expense-tracker",
    label: "Expense Tracker",
    mode: "records",
    itemLabel: "expense",
    blurb:
      "An array of flat records, declared rather than inferred: Amount is a number column (sums and rollups work), Category is a select with the widget's own options, Date is a date.",
    tryThis: "In the table, change Amount on a row: the widget's list updates on the next pull, and the row is not duplicated.",
    seed: [
      { description: "Coffee", amount: 4.5, category: "Food", date: "2026-10-09" },
      { description: "Train ticket", amount: 22, category: "Travel", date: "2026-10-10" },
      { description: "Desk lamp", amount: 38.9, category: "Home", date: "2026-10-11" },
    ],
  },
  {
    slug: "chore-checklist",
    label: "Chore Checklist",
    mode: "records",
    itemLabel: "chore",
    blurb:
      "Done is a checkbox, not the string \"true\". The key is the chore and the day, so the same chore on two days is two rows and ticking it in Notion ticks it on every device.",
    tryThis: "Tick a chore in the widget, then flip its Done checkbox in the table and watch the tick move the other way.",
    seed: [
      { task: "Water the plants", day: "2026-10-11", assignee: "Sam", done: false },
      { task: "Take the bins out", day: "2026-10-11", assignee: "Alex", done: true },
      { task: "Change the bedding", day: "2026-10-12", assignee: "Sam", done: false },
    ],
  },
  {
    slug: "action-item-tracker",
    label: "Action Item Tracker",
    mode: "records",
    itemLabel: "action item",
    blurb:
      "State is one of three values the widget knows about, so it becomes a select with exactly those options. The key is the task and its due date.",
    tryThis: "Add an item with a due date, then set its State to Done in the table and pull.",
    seed: [
      { task: "Send the Q4 draft", owner: "Priya", due: "2026-10-14", state: "Open" },
      { task: "Book the offsite", owner: "Marco", due: "2026-10-09", state: "Done" },
      { task: "Review the contract", owner: "Sam", due: "2026-10-16", state: "In progress" },
    ],
  },
  {
    slug: "bookmark-library",
    label: "Bookmark Library",
    mode: "records",
    itemLabel: "bookmark",
    blurb:
      "URL is a real url property, so the cell is clickable in Notion instead of being text that looks like a link. Tag is a select, opened up by the first write if it is a new one.",
    tryThis: "Paste a URL in the widget, then click the cell in the table: it opens, because the property is a URL.",
    seed: [
      { name: "Notion API reference", url: "https://developers.notion.com/reference/intro", tag: "Docs" },
      { name: "Rich text objects", url: "https://developers.notion.com/reference/rich-text", tag: "Docs" },
      { name: "Arena components", url: "https://notion-arena.example/components", tag: "Arena" },
    ],
  },
  {
    slug: "daily-journal",
    label: "Daily Journal",
    mode: "records",
    itemLabel: "entry",
    blurb:
      "The long-text case: the widget allows 3,000 characters, Notion holds 2,000 per rich text object, so a long entry is written as several objects in one cell and read back whole.",
    tryThis: "Write a long entry in the widget and check the table: the Body cell holds all of it, not the first 1,900 characters.",
    seed: [
      {
        date: "2026-10-10",
        title: "Shipped the figures",
        body: "Six diagrams, exported to PNG in both themes. The dark set was identical to the light set for a while: the exporter was reading the light token block because `.dark` appears inside `@custom-variant dark` on line 3. Worth remembering that a probe which disagrees with the thing it probes is the broken one.",
      },
      { date: "2026-10-11", title: "Short one", body: "Wrote the schemas for ten components; the SPEC family maps itself." },
    ],
  },
  {
    slug: "grocery-list",
    label: "Grocery List",
    mode: "kv-blob",
    itemLabel: "state row",
    blurb:
      "State-blob mode, and honestly so: the widget keys its lists by a hash of the label, so a record schema would produce a List column full of values no person can read. One row holds the document, with a revision and an updated stamp.",
    tryThis: "Tick an item and watch the State cell's revision climb, then edit the JSON in the cell and pull: the widget adopts it.",
    seed: {
      lists: {
        g1a2b: [
          { name: "Milk", done: false },
          { name: "Bread", done: true },
          { name: "Olives", done: false },
        ],
      },
    },
  },
  {
    slug: "invoice-tracker",
    label: "Invoice Tracker",
    mode: "records",
    itemLabel: "invoice",
    blurb:
      "One of the 84 widgets generated from a SPEC, so its columns come from the widget's own field list: Amount is a number, Issued and Due are dates, State is a select over Draft, Sent, Paid, Overdue, Void.",
    tryThis: "Change State to Paid in the table, pull, and watch the widget's own totals change.",
    seed: [
      { id: "inv1", status: "Sent", title: "Site redesign", client: "Northwind", amount: "4800", issued: "2026-09-28", due: "2026-10-12", note: "50% on signature" },
      { id: "inv2", status: "Paid", title: "Retainer, September", client: "Contoso", amount: "2400", issued: "2026-09-01", due: "2026-09-15", note: "" },
      { id: "inv3", status: "Draft", title: "Accessibility audit", client: "Fabrikam", amount: "1850", issued: "2026-10-08", due: "2026-10-22", note: "Scope agreed by email" },
    ],
  },
  {
    slug: "equipment-inventory",
    label: "Equipment Inventory",
    mode: "records",
    itemLabel: "item",
    blurb:
      "SPEC family with two selects: the provisioned table offers the same options the widget's dropdown does, because the vocabulary travels with the binding instead of being invented at the first write.",
    tryThis: "Set Condition to Needs repair in the table, then open the widget: the badge changed without anyone touching the widget.",
    seed: [
      { id: "eq1", status: "In use", title: "MacBook Pro 14", location: "Desk 4", category: "Computer", condition: "Good", quantity: "1", note: "Assigned to Sam" },
      { id: "eq2", status: "Available", title: "Dell U2723QE", location: "Store room", category: "Peripheral", condition: "New", quantity: "2", note: "" },
      { id: "eq3", status: "In repair", title: "Standing desk motor", location: "Service", category: "Furniture", condition: "Needs repair", quantity: "1", note: "Warranty claim open" },
    ],
  },
  {
    slug: "incident-log",
    label: "Incident Log",
    mode: "records",
    itemLabel: "incident",
    blurb:
      "The checklist case: five fixed steps per incident, stored in Notion as a multi_select of the steps that are done. The labels are fixed by the widget, so nothing is lost and the column is still queryable.",
    tryThis: "Tick one timeline step in the widget, then filter the table by Checks: the label is in the cell.",
    seed: [
      {
        id: "inc1",
        status: "Mitigating",
        title: "p99 over 4s for eleven minutes after a deploy",
        system: "Public API",
        severity: "P1 High",
        detected: "2026-10-11",
        owner: "Priya",
        note: "Reads degraded for every workspace; writes unaffected.",
        checks: [
          { label: "Timeline captured", done: true },
          { label: "Impact and blast radius noted", done: true },
          { label: "Root cause identified", done: false },
          { label: "Follow-up actions filed", done: false },
          { label: "Review scheduled", done: false },
        ],
      },
      {
        id: "inc2",
        status: "Resolved",
        title: "Webhook deliveries piled up for twenty minutes",
        system: "Event delivery",
        severity: "P2 Normal",
        detected: "2026-10-04",
        owner: "Marco",
        note: "Retries caught up on their own; no customer reports.",
        checks: [
          { label: "Timeline captured", done: true },
          { label: "Impact and blast radius noted", done: true },
          { label: "Root cause identified", done: true },
          { label: "Follow-up actions filed", done: true },
          { label: "Review scheduled", done: true },
        ],
      },
    ],
  },
];

export const BOUND_SLUGS = BOUND_COMPONENTS.map((c) => c.slug);

export function boundComponent(slug: string): BoundComponent | undefined {
  return BOUND_COMPONENTS.find((c) => c.slug === slug);
}
