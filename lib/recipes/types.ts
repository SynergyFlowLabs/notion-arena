import type { Block, PropertySchema, ViewSpec } from "@/lib/notion/schema";

export interface RecipeDb {
  /** local reference used by relations, rollups and views */
  ref: string;
  title: string;
  icon: string;
  isInline?: boolean;
  properties: Record<string, PropertySchema>;
  /** a few rows so the views are not empty on first open */
  seed?: { name: string; props?: Record<string, unknown> }[];
}

export interface RecipePage {
  title: string;
  icon?: string;
  blocks: Block[];
}

export interface RecipeManual {
  title: string;
  /** why this cannot be scripted — always a real Notion API limitation */
  reason: string;
  steps: string[];
}

export interface Recipe {
  id: string;
  summary: string;
  databases: RecipeDb[];
  views: ViewSpec[];
  pages: RecipePage[];
  manual: RecipeManual[];
}

export const BUTTON_LIMITATION =
  "Button properties are response-only in the Notion API: the schema is returned on read, but the API ignores button settings on write and cannot create a button or configure its actions.";

export const AUTOMATION_LIMITATION =
  "Database automations have no public API surface. They are configured per-database in the Notion app under ••• → Automations.";

export const RECURRING_LIMITATION =
  "Recurring database templates (daily/weekly/monthly) are configured in the app on the template's ••• menu; the API can create pages from a template but cannot schedule recurrence.";

export const SYNCED_BLOCK_LIMITATION =
  "The API can append an original synced_block, but the duplicate instances that reference it must be created in the app.";
