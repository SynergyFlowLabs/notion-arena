import {
  bullet,
  callout,
  chk,
  code,
  columns,
  compoundFilter,
  createdBy,
  createdTime,
  date,
  defaultStatus,
  divider,
  email,
  filterProperty,
  filesProp,
  formula,
  heading,
  multi,
  num,
  numbered,
  paragraph,
  person,
  phone,
  relation,
  rich,
  rollup,
  sel,
  simpleTable,
  status,
  t,
  text,
  title,
  todo,
  toggle,
  uniqueId,
  url,
  type PropertySchema,
  type ViewSpec,
} from "@/lib/notion/schema";
import {
  AUTOMATION_LIMITATION,
  BUTTON_LIMITATION,
  RECURRING_LIMITATION,
  type Recipe,
} from "./types";

/* ================================================================== */
/* CRM PIPELINE                                                        */
/* ================================================================== */

export const crmPipeline: Recipe = {
  id: "crm-pipeline",
  summary:
    "Companies, People and Deals as three related data sources, with stage rollups, a weighted-value chart and a dashboard that assembles them.",
  databases: [
    {
      ref: "companies",
      title: "Companies",
      icon: "🏢",
      properties: {
        Name: title(),
        Website: url(),
        Industry: sel([
          { name: "Software", color: "blue" },
          { name: "Services", color: "green" },
          { name: "Retail", color: "yellow" },
          { name: "Finance", color: "purple" },
          { name: "Healthcare", color: "pink" },
          { name: "Other", color: "gray" },
        ]),
        Segment: sel([
          { name: "SMB", color: "gray" },
          { name: "Mid-market", color: "blue" },
          { name: "Enterprise", color: "purple" },
        ]),
        "Employee count": num("number"),
        "Account owner": person(),
        "Health": sel([
          { name: "Healthy", color: "green" },
          { name: "At risk", color: "yellow" },
          { name: "Critical", color: "red" },
        ]),
        "Next touch": date(),
        Notes: text(),
        "People": relation("people", { twoWay: true, syncedName: "Company" }),
        "Deals": relation("deals", { twoWay: true, syncedName: "Company" }),
        "Open pipeline": rollup("Deals", "Value", "sum", "Sum of every deal value at this company."),
        "Closed won": rollup("Won deals", "Value", "sum"),
        "Lifetime value": formula(
          'prop("Closed won")',
          "Replace with the Closed won rollup once the filtered relation exists."
        ),
        "Days since touch": formula(
          'if(empty(prop("Next touch")), 999, dateBetween(now(), prop("Next touch"), "days"))'
        ),
        Created: createdTime(),
      },
      seed: [
        {
          name: "Northwind Logistics",
          props: { Industry: "Services", Segment: "Mid-market", "Employee count": 240 },
        },
        { name: "Kestrel Labs", props: { Industry: "Software", Segment: "SMB", "Employee count": 32 } },
        { name: "Aurelia Health", props: { Industry: "Healthcare", Segment: "Enterprise", "Employee count": 5400 } },
      ],
    },
    {
      ref: "people",
      title: "People",
      icon: "👤",
      properties: {
        Name: title(),
        "Job title": text(),
        Email: email(),
        Phone: phone(),
        "Decision maker": chk(),
        Champion: chk(),
        Company: relation("companies"),
        "Last contact": date(),
        Channels: multi([
          { name: "Email", color: "blue" },
          { name: "Call", color: "green" },
          { name: "LinkedIn", color: "purple" },
          { name: "Event", color: "yellow" },
        ]),
        "Added by": createdBy(),
        "Days quiet": formula(
          'if(empty(prop("Last contact")), 0, dateBetween(now(), prop("Last contact"), "days"))'
        ),
        "Follow up": formula(
          'ifs(prop("Days quiet") > 30, "🔴 Overdue", prop("Days quiet") > 14, "🟡 Soon", true, "🟢 Fresh")'
        ),
      },
      seed: [
        { name: "Dana Whitfield", props: { "Job title": "Head of Operations", "Decision maker": true } },
        { name: "Omar Haddad", props: { "Job title": "CTO", Champion: true } },
      ],
    },
    {
      ref: "deals",
      title: "Deals",
      icon: "💰",
      properties: {
        Name: title(),
        "Deal ID": uniqueId("DL"),
        Stage: status([
          { name: "Lead", color: "gray", group: "To-do" },
          { name: "Qualified", color: "blue", group: "To-do" },
          { name: "Demo given", color: "blue", group: "In progress" },
          { name: "Proposal out", color: "yellow", group: "In progress" },
          { name: "Negotiation", color: "orange", group: "In progress" },
          { name: "Won", color: "green", group: "Complete" },
          { name: "Lost", color: "red", group: "Complete" },
        ]),
        Value: num("dollar"),
        Currency: sel([
          { name: "USD", color: "green" },
          { name: "EUR", color: "blue" },
          { name: "GBP", color: "purple" },
          { name: "PKR", color: "yellow" },
        ]),
        "Probability": num("percent"),
        "Expected close": date(),
        "Owner": person(),
        Company: relation("companies"),
        "Primary contact": relation("people"),
        Source: sel([
          { name: "Inbound", color: "green" },
          { name: "Outbound", color: "blue" },
          { name: "Referral", color: "purple" },
          { name: "Event", color: "yellow" },
          { name: "Partner", color: "pink" },
        ]),
        "Blocked": chk(),
        "Next step": text(),
        "Weighted value": formula('prop("Value") * prop("Probability")'),
        "Days in stage": formula(
          'dateBetween(now(), date(prop("Last stage change") ?? prop("Created")), "days")'
        ),
        "Stale": formula('if(prop("Days in stage") > 21, "⚠️ Stale", "")'),
        "Overdue": formula(
          'if(and(prop("Expected close") < now(), not(or(prop("Stage") == "Won", prop("Stage") == "Lost"))), "🔴 Slipped", "")'
        ),
        Created: createdTime(),
        "Attachments": filesProp(),
      },
      seed: [
        {
          name: "Northwind — Platform rollout",
          props: { Stage: "Proposal out", Value: 48000, Probability: 0.6, Source: "Inbound" },
        },
        {
          name: "Kestrel Labs — Starter",
          props: { Stage: "Demo given", Value: 9600, Probability: 0.4, Source: "Referral" },
        },
        {
          name: "Aurelia Health — Enterprise",
          props: { Stage: "Qualified", Value: 180000, Probability: 0.2, Source: "Outbound" },
        },
      ],
    },
  ],
  views: [
    {
      on: "deals",
      name: "Pipeline board",
      type: "board",
      configuration: {
        type: "board",
        group_by: { type: "status", property_name: "Stage", group_by: "group", sort: { type: "manual" } },
        card_layout: "comfortable",
        cover_size: "medium",
      },
    },
    {
      on: "deals",
      name: "Weighted pipeline",
      type: "chart",
      configuration: {
        type: "chart",
        chart_type: "column",
        x_axis: { type: "select", property_name: "Stage", sort: { type: "manual" } },
        y_axis: { aggregator: "sum", property_name: "Weighted value" },
        color_theme: "blue",
        color_by_value: true,
        show_data_labels: true,
        height: "medium",
      },
    },
    {
      on: "deals",
      name: "Closing this month",
      type: "list",
      filter: compoundFilter("and", [
        filterProperty("Expected close", "on_or_before", {
          value: "end_of_this_month",
        }),
        filterProperty("Stage", "group_does_not_equal", "Complete"),
      ]),
      sorts: [{ property: "Expected close", direction: "ascending" }],
    },
    {
      on: "deals",
      name: "Slipped",
      type: "table",
      filter: filterProperty("Overdue", "string", { equals: "🔴 Slipped" }),
    },
    {
      on: "companies",
      name: "Accounts gallery",
      type: "gallery",
      configuration: { type: "gallery", card_layout: "cover_dominant", cover_size: "small" },
      sorts: [{ property: "Open pipeline", direction: "descending" }],
    },
    {
      on: "people",
      name: "Needs a touch",
      type: "table",
      filter: filterProperty("Follow up", "string", { equals: "🔴 Overdue" }),
      sorts: [{ property: "Days quiet", direction: "descending" }],
    },
  ],
  pages: [
    {
      title: "CRM — how this system works",
      icon: "🧭",
      blocks: [
        callout(
          [
            t("Three data sources, one pipeline. ", { bold: true }),
            t(
              "Deals hold the money, Companies hold the relationship, People hold the conversations. Every deal links to one company and one primary contact, and the rollups on Companies mean lifetime value is never stale."
            ),
          ],
          "🧭",
          "blue_background"
        ),
        heading(2, "The stage ladder"),
        paragraph([
          t(
            "Stage is a Status property, not a Select. That matters: Status options belong to groups (To-do / In progress / Complete), so Notion's board view can group by group, and the "
          ),
          t("group_does_not_equal", { code: true }),
          t(" filter operator can exclude everything closed in one condition."),
        ]),
        simpleTable([
          ["Stage", "Group", "Exit criterion"],
          ["Lead", "To-do", "A real person has replied"],
          ["Qualified", "To-do", "Budget, authority and timeline confirmed"],
          ["Demo given", "In progress", "Technical evaluation started"],
          ["Proposal out", "In progress", "Pricing sent in writing"],
          ["Negotiation", "In progress", "Redlines or procurement in play"],
          ["Won / Lost", "Complete", "Contract signed, or a written no"],
        ]),
        heading(2, "Formulas you will actually use"),
        toggle([t("Weighted value")], [
          code('prop("Value") * prop("Probability")', "javascript"),
          paragraph([
            t("Feed this into the chart view's Y axis with a "),
            t("sum", { code: true }),
            t(" aggregator and you get a forecast that respects probability, not just a count of deals."),
          ]),
        ]),
        toggle([t("Days in stage → Stale")], [
          code('dateBetween(now(), prop("Last stage change"), "days") > 21', "javascript"),
          paragraph([
            t(
              "Deals do not die loudly, they go quiet. This surfaces anything that has not moved in three weeks. It needs a date property that changes when the stage changes — set that with an automation (see the manual steps)."
            ),
          ]),
        ]),
        divider(),
        heading(2, "Adding a deal"),
        todo([t("Create the Company first if it does not exist — never a deal without one")]),
        todo([t("Set Value, Probability and Expected close on the same day you create it")]),
        todo([t("Link a Primary contact; an unlinked deal has nobody to follow up with")]),
        todo([t("Write the Next step in one sentence, as a verb")]),
      ],
    },
  ],
  manual: [
    {
      title: "Button: “Log a call” on every Deal",
      reason: BUTTON_LIMITATION,
      steps: [
        "Open the Deals database → ••• → Property → Button.",
        "Name it “Log a call”.",
        "Action 1: Add page to → People. Pre-fill Company with the deal's Company, and Last contact with Today.",
        "Action 2: Edit pages in → Deals (this page). Set Last touch to Today.",
        "Place the button in the Deals page layout so it sits above the notes.",
      ],
    },
    {
      title: "Automation: stamp “Last stage change” when Stage moves",
      reason: AUTOMATION_LIMITATION,
      steps: [
        "Deals → ••• → Automations → New automation.",
        "Trigger: Stage changes. Leave “from” as Any.",
        "Action: Edit page → set Last stage change to Today.",
        "Optional second action: add a Slack message to #sales when Stage becomes Won.",
        "This is what makes the Days in stage formula meaningful.",
      ],
    },
    {
      title: "Automation: nudge the owner when a deal slips",
      reason: AUTOMATION_LIMITATION,
      steps: [
        "Trigger: Expected close is before Today AND Stage is not in the Complete group.",
        "Action: Add a comment @mentioning the Owner with “This deal has slipped — update the close date or move the stage.”",
        "Action: set Blocked to true, so the Slipped view stays honest.",
      ],
    },
  ],
};

/* ================================================================== */
/* SPRINT TRACKER                                                      */
/* ================================================================== */

export const sprintTracker: Recipe = {
  id: "sprint-tracker",
  summary:
    "Epics and Stories with a two-way relation, points rollups, a sprint board with a subtask toggle column, and a velocity line chart.",
  databases: [
    {
      ref: "epics",
      title: "Epics",
      icon: "🏔️",
      properties: {
        Name: title(),
        "Epic ID": uniqueId("EP"),
        Status: status([
          { name: "Backlog", color: "gray", group: "To-do" },
          { name: "This quarter", color: "blue", group: "To-do" },
          { name: "In flight", color: "yellow", group: "In progress" },
          { name: "Shipped", color: "green", group: "Complete" },
          { name: "Cut", color: "red", group: "Complete" },
        ]),
        "Squad": sel([
          { name: "Platform", color: "blue" },
          { name: "Product", color: "purple" },
          { name: "Growth", color: "green" },
        ]),
        "Target quarter": sel([
          { name: "2026 Q3", color: "gray" },
          { name: "2026 Q4", color: "blue" },
          { name: "2027 Q1", color: "purple" },
        ]),
        Owner: person(),
        "Stories": relation("stories", { twoWay: true, syncedName: "Epic" }),
        "Points total": rollup("Stories", "Points", "sum"),
        "Points done": rollup("Done stories", "Points", "sum"),
        "% complete": formula(
          'if(prop("Points total") == 0, 0, round(prop("Points done") / prop("Points total") * 100) / 100)'
        ),
        "Progress bar": formula(
          'slice("██████████", 0, round(prop("% complete") * 10)) + " " + format(round(prop("% complete") * 100)) + "%"'
        ),
      },
      seed: [
        { name: "Component registry v2", props: { Status: "In flight", Squad: "Platform", "Target quarter": "2026 Q4" } },
        { name: "Self-serve onboarding", props: { Status: "This quarter", Squad: "Growth", "Target quarter": "2026 Q4" } },
      ],
    },
    {
      ref: "stories",
      title: "Stories",
      icon: "🎟️",
      properties: {
        Name: title(),
        "Story ID": uniqueId("ST"),
        Status: status([
          { name: "Triage", color: "gray", group: "To-do" },
          { name: "Ready", color: "blue", group: "To-do" },
          { name: "In progress", color: "yellow", group: "In progress" },
          { name: "In review", color: "purple", group: "In progress" },
          { name: "QA", color: "orange", group: "In progress" },
          { name: "Done", color: "green", group: "Complete" },
          { name: "Won't do", color: "red", group: "Complete" },
        ]),
        Type: sel([
          { name: "Feature", color: "blue" },
          { name: "Bug", color: "red" },
          { name: "Chore", color: "gray" },
          { name: "Spike", color: "purple" },
        ]),
        Points: sel([
          { name: "1", color: "gray" },
          { name: "2", color: "gray" },
          { name: "3", color: "blue" },
          { name: "5", color: "blue" },
          { name: "8", color: "yellow" },
          { name: "13", color: "red" },
        ]),
        Sprint: relation("sprints", { twoWay: true, syncedName: "Stories" }),
        Epic: relation("epics"),
        Assignee: person(),
        "Blocked": chk(),
        "Carried over": chk(),
        "Done at": date(),
        "Acceptance criteria": text(),
        Created: createdTime(),
        "In review for": formula(
          'if(prop("Status") == "In review", dateBetween(now(), prop("Last edited"), "days"), 0)'
        ),
        "Needs attention": formula(
          'ifs(prop("Blocked"), "🚫 Blocked", prop("In review for") > 3, "🐌 Stuck in review", prop("Status") == "Triage" and prop("Carried over"), "↩️ Carried over", true, "")'
        ),
        "Last edited": { last_edited_time: {} } as PropertySchema,
      },
      seed: [
        { name: "Registry JSON endpoints", props: { Status: "In progress", Type: "Feature", Points: "5" } },
        { name: "Widget sandbox hardening", props: { Status: "In review", Type: "Chore", Points: "3" } },
        { name: "Embed height jumps on resize", props: { Status: "Triage", Type: "Bug", Points: "2" } },
      ],
    },
    {
      ref: "sprints",
      title: "Sprints",
      icon: "🏃",
      properties: {
        Name: title(),
        Status: status([
          { name: "Planned", color: "gray", group: "To-do" },
          { name: "Active", color: "yellow", group: "In progress" },
          { name: "Closed", color: "green", group: "Complete" },
        ]),
        Start: date(),
        End: date(),
        "Capacity (points)": num("number"),
        Goal: text(),
        Stories: relation("stories"),
        "Committed points": rollup("Stories", "Points", "count_values"),
        "Days left": formula(
          'if(empty(prop("End")), 0, dateBetween(prop("End"), now(), "days"))'
        ),
        "Velocity": rollup("Done stories", "Points", "count_values"),
      },
      seed: [
        { name: "Sprint 24 — registry", props: { Status: "Active", "Capacity (points)": 34, Goal: "Ship the public registry endpoints and harden the widget sandbox." } },
        { name: "Sprint 25 — install flow", props: { Status: "Planned", "Capacity (points)": 34 } },
      ],
    },
  ],
  views: [
    {
      on: "stories",
      name: "Sprint board",
      type: "board",
      configuration: {
        type: "board",
        group_by: { type: "status", property_name: "Status", group_by: "option", sort: { type: "manual" } },
        subtasks: { property_name: "Epic", toggle_column_name: "Blocked" },
        card_layout: "comfortable",
      },
      filter: filterProperty("Status", "group_does_not_equal", "Complete"),
    },
    {
      on: "stories",
      name: "Backlog",
      type: "list",
      filter: filterProperty("Sprint", "relation", { is_empty: true }),
      sorts: [{ property: "Points", direction: "ascending" }],
    },
    {
      on: "stories",
      name: "Needs attention",
      type: "table",
      filter: filterProperty("Needs attention", "string", { does_not_equal: "" }),
    },
    {
      on: "epics",
      name: "Velocity by epic",
      type: "chart",
      configuration: {
        type: "chart",
        chart_type: "bar",
        x_axis: { type: "select", property_name: "Squad", sort: { type: "manual" } },
        y_axis: { aggregator: "sum", property_name: "Points done" },
        color_theme: "purple",
        show_data_labels: true,
        height: "medium",
      },
    },
    {
      on: "sprints",
      name: "Sprint timeline",
      type: "timeline",
      configuration: { type: "timeline" },
    },
    { on: "sprints", name: "Sprint dashboard", type: "dashboard" },
  ],
  pages: [
    {
      title: "Sprint rituals",
      icon: "🔁",
      blocks: [
        heading(2, "Monday — planning, 45 minutes"),
        numbered([t("Read the sprint goal out loud. If nobody can, rewrite it before you pick work.")]),
        numbered([t("Pull from Backlog, not from Triage. Triage is not estimable by definition.")]),
        numbered([t("Stop at capacity. Carry-over stories count against capacity first.")]),
        heading(2, "Daily — 10 minutes"),
        bullet([t("Work the Needs attention view, not the board. The board tells you where things are; that view tells you where they are stuck.")]),
        bullet([t("Anything In review for more than three days gets a name and a decision today.")]),
        heading(2, "Friday — review and retro, 40 minutes"),
        bullet([t("Compare Velocity to Capacity. Two consecutive sprints over capacity means the capacity number is wrong, not the team.")]),
        callout(
          [t("Carried-over stories get "), t("Carried over", { code: true }), t(" ticked before the sprint closes, or velocity lies to you next quarter.")],
          "⚠️",
          "yellow_background"
        ),
      ],
    },
  ],
  manual: [
    {
      title: "Database template: “New story”",
      reason:
        "The API can apply a template when creating a page, but it cannot author the template's body. Build it once in the app and every new story inherits it.",
      steps: [
        "Stories → the ▾ next to New → + New template.",
        "Name it “New story”, set Status to Triage and Type to Feature as defaults.",
        "Body: an H2 “Context”, a to-do group “Acceptance criteria” with three empty items, an H2 “Notes”, and a callout “Definition of done”.",
        "Save. Optionally set it as the default for the Status = Triage filter.",
      ],
    },
    {
      title: "Automation: move to QA when In review clears",
      reason: AUTOMATION_LIMITATION,
      steps: [
        "Stories → Automations → New automation.",
        "Trigger: Status changes to In review.",
        "Action: after 2 days, add a comment @mentioning the Assignee.",
        "Second automation: trigger when Blocked is checked → post to the squad's Slack channel.",
      ],
    },
    {
      title: "Widget views on the sprint dashboard",
      reason:
        "Dashboard layout is read-only in the API. You can create the dashboard view itself, but each widget is a separate POST /v1/views with view_id set to the dashboard — the order they are created in becomes the layout.",
      steps: [
        "Create the dashboard view: POST /v1/views with type: \"dashboard\" and the Stories data source's database_id.",
        "Then, for each widget, POST /v1/views with view_id = the dashboard id and the widget's own data_source_id.",
        "Suggested order: a Number widget for Days left, a Board widget for the sprint, a Chart widget for velocity.",
        "Up to 12 widgets, 4 per row.",
      ],
    },
  ],
};

/* ================================================================== */
/* OKR SYSTEM                                                          */
/* ================================================================== */

export const okrSystem: Recipe = {
  id: "okr-system",
  summary:
    "Objectives and Key Results with progress computed from start/target/current, confidence scoring, and a quarter-scoped chart.",
  databases: [
    {
      ref: "objectives",
      title: "Objectives",
      icon: "🎯",
      properties: {
        Name: title(),
        Quarter: sel([
          { name: "2026 Q3", color: "gray" },
          { name: "2026 Q4", color: "blue" },
          { name: "2027 Q1", color: "purple" },
          { name: "2027 Q2", color: "green" },
        ]),
        Team: sel([
          { name: "Company", color: "purple" },
          { name: "Product", color: "blue" },
          { name: "Engineering", color: "green" },
          { name: "Revenue", color: "yellow" },
        ]),
        Owner: person(),
        Status: status([
          { name: "Draft", color: "gray", group: "To-do" },
          { name: "Committed", color: "blue", group: "To-do" },
          { name: "Tracking", color: "yellow", group: "In progress" },
          { name: "Achieved", color: "green", group: "Complete" },
          { name: "Abandoned", color: "red", group: "Complete" },
        ]),
        "Why it matters": text(),
        "Key results": relation("keyResults", { twoWay: true, syncedName: "Objective" }),
        "KR count": rollup("Key results", "Name", "count_values"),
        "Average progress": rollup("Key results", "Progress", "average"),
        "Average confidence": rollup("Key results", "Confidence", "average"),
        "Score": formula(
          'if(prop("KR count") == 0, 0, round(prop("Average progress") * 100))'
        ),
        "On track": formula(
          'ifs(prop("Score") >= 70, "🟢 On track", prop("Score") >= 40, "🟡 At risk", prop("Score") > 0, "🔴 Off track", true, "⚪ Not started")'
        ),
        "Days left in quarter": formula(
          'dateBetween(dateAdd(now(), 90, "days"), now(), "days")'
        ),
      },
      seed: [
        {
          name: "Become the default way teams extend Notion",
          props: { Quarter: "2026 Q4", Team: "Company", Status: "Tracking" },
        },
        {
          name: "Make first-install a sub-minute experience",
          props: { Quarter: "2026 Q4", Team: "Product", Status: "Committed" },
        },
      ],
    },
    {
      ref: "keyResults",
      title: "Key Results",
      icon: "📐",
      properties: {
        Name: title(),
        Objective: relation("objectives"),
        Owner: person(),
        Metric: sel([
          { name: "Count", color: "blue" },
          { name: "Percentage", color: "green" },
          { name: "Revenue", color: "yellow" },
          { name: "Time", color: "purple" },
          { name: "Rating", color: "pink" },
        ]),
        "Start value": num("number"),
        "Target value": num("number"),
        "Current value": num("number"),
        Unit: text(),
        "Confidence": num("number", "1 (no chance) to 10 (certain). Updated weekly, never computed."),
        "Last updated": date(),
        "Initiatives": relation("initiatives", { twoWay: true, syncedName: "Key result" }),
        Progress: formula(
          'if(prop("Target value") == prop("Start value"), 0, min(1, max(0, (prop("Current value") - prop("Start value")) / (prop("Target value") - prop("Start value")))))'
        ),
        "Progress label": formula('format(round(prop("Progress") * 100)) + "%"'),
        "Stale": formula(
          'if(empty(prop("Last updated")), true, dateBetween(now(), prop("Last updated"), "days") > 10)'
        ),
        "Confidence label": formula(
          'ifs(prop("Confidence") >= 8, "🟢 " + format(prop("Confidence")), prop("Confidence") >= 5, "🟡 " + format(prop("Confidence")), true, "🔴 " + format(prop("Confidence")))'
        ),
      },
      seed: [
        { name: "1,000 workspaces with a component installed", props: { Metric: "Count", "Start value": 0, "Target value": 1000, "Current value": 214, Confidence: 7 } },
        { name: "Median install time under 45 seconds", props: { Metric: "Time", "Start value": 240, "Target value": 45, "Current value": 132, Confidence: 6 } },
        { name: "60% of installs come from the registry API", props: { Metric: "Percentage", "Start value": 0, "Target value": 60, "Current value": 18, Confidence: 5 } },
      ],
    },
    {
      ref: "initiatives",
      title: "Initiatives",
      icon: "🛠️",
      properties: {
        Name: title(),
        Status: defaultStatus(),
        Owner: person(),
        Due: date(),
        "Key result": relation("keyResults"),
        Notes: text(),
      },
      seed: [{ name: "Public registry endpoints", props: {} }, { name: "One-click install from the detail page" }],
    },
  ],
  views: [
    {
      on: "objectives",
      name: "This quarter",
      type: "board",
      configuration: {
        type: "board",
        group_by: { type: "select", property_name: "Team", sort: { type: "manual" } },
        card_layout: "comfortable",
      },
      filter: filterProperty("Quarter", "select", { equals: "2026 Q4" }),
    },
    {
      on: "objectives",
      name: "Scores by team",
      type: "chart",
      configuration: {
        type: "chart",
        chart_type: "column",
        x_axis: { type: "select", property_name: "Team", sort: { type: "manual" } },
        y_axis: { aggregator: "average", property_name: "Score" },
        color_theme: "purple",
        show_data_labels: true,
        height: "medium",
      },
    },
    {
      on: "keyResults",
      name: "Needs an update",
      type: "table",
      filter: filterProperty("Stale", "checkbox", { equals: true }),
      sorts: [{ property: "Last updated", direction: "ascending" }],
    },
    { on: "keyResults", name: "All key results", type: "list" },
    { on: "initiatives", name: "Initiative board", type: "board", configuration: { type: "board" } },
  ],
  pages: [
    {
      title: "Weekly OKR check-in",
      icon: "🗓️",
      blocks: [
        callout(
          [t("Fifteen minutes, every Friday. ", { bold: true }), t("Update Current value and Confidence before the meeting, not during it.")],
          "🗓️",
          "purple_background"
        ),
        heading(3, "1. Numbers first"),
        paragraph([t("For each key result: what is the current value, and what moved it this week?")]),
        heading(3, "2. Confidence second"),
        paragraph([
          t("Confidence is a judgement, not a computation. If it dropped by three or more points, that key result is the agenda."),
        ]),
        heading(3, "3. One decision"),
        paragraph([t("Every check-in ends with exactly one decision: keep, add an initiative, or abandon. Not three.")]),
        divider(),
        toggle([t("Why Confidence is a number and not a formula")], [
          paragraph([
            t(
              "A formula can only see properties on the same row. Confidence is a forecast about the future, which no property can express. Notion formulas cannot trigger side effects either — so a low confidence cannot itself alert anyone. That is what the automation below is for."
            ),
          ]),
        ]),
      ],
    },
  ],
  manual: [
    {
      title: "Automation: flag confidence below 5",
      reason: AUTOMATION_LIMITATION,
      steps: [
        "Key Results → Automations → New automation.",
        "Trigger: Confidence changes, to a value less than 5.",
        "Action: Add a comment @mentioning the Owner and the Objective's Owner.",
        "Action: set the parent Objective's Status to Tracking so it surfaces in the review.",
      ],
    },
    {
      title: "Recurring template: weekly check-in page",
      reason: RECURRING_LIMITATION,
      steps: [
        "Create a database “OKR check-ins” with Date, Attendees (Person) and a linked view of Key Results filtered to Needs an update.",
        "New → ▾ → + New template → body: the three headings above plus an embedded linked view.",
        "Template ••• → Repeat → Every Friday at 09:00.",
      ],
    },
  ],
};

/* ================================================================== */
/* INVOICE GENERATOR                                                   */
/* ================================================================== */

export const invoiceGenerator: Recipe = {
  id: "invoice-generator",
  summary:
    "Clients, Invoices and Line Items with tax computed per client, a printable page-body layout, and revenue-by-month chart.",
  databases: [
    {
      ref: "clients",
      title: "Clients",
      icon: "🏢",
      properties: {
        Name: title(),
        Contact: person(),
        Email: email(),
        "Billing address": text(),
        "Tax ID": text(),
        "Tax rate": num("percent", "Applied to every invoice for this client."),
        Currency: sel([
          { name: "USD", color: "green" },
          { name: "EUR", color: "blue" },
          { name: "GBP", color: "purple" },
          { name: "PKR", color: "yellow" },
        ]),
        "Payment terms (days)": num("number"),
        Invoices: relation("invoices", { twoWay: true, syncedName: "Client" }),
        "Total invoiced": rollup("Invoices", "Grand total", "sum"),
        "Total paid": rollup("Paid invoices", "Grand total", "sum"),
        Outstanding: formula('prop("Total invoiced") - prop("Total paid")'),
      },
      seed: [
        { name: "Northwind Logistics", props: { "Tax rate": 0.2, Currency: "USD", "Payment terms (days)": 30 } },
        { name: "Kestrel Labs", props: { "Tax rate": 0, Currency: "USD", "Payment terms (days)": 14 } },
      ],
    },
    {
      ref: "invoices",
      title: "Invoices",
      icon: "🧾",
      properties: {
        Name: title(),
        "Invoice number": uniqueId("INV"),
        Status: status([
          { name: "Draft", color: "gray", group: "To-do" },
          { name: "Sent", color: "blue", group: "In progress" },
          { name: "Overdue", color: "red", group: "In progress" },
          { name: "Paid", color: "green", group: "Complete" },
          { name: "Void", color: "gray", group: "Complete" },
        ]),
        Client: relation("clients"),
        "Issue date": date(),
        "Due date": date(),
        "Paid date": date(),
        LineItems: relation("lineItems", { twoWay: true, syncedName: "Invoice" }),
        "Subtotal": rollup("LineItems", "Line total", "sum"),
        "Tax rate": rollup("Client", "Tax rate", "show_original"),
        "Tax": formula('prop("Subtotal") * prop("Tax rate")'),
        "Grand total": formula('prop("Subtotal") + prop("Tax")'),
        "Days overdue": formula(
          'if(prop("Status") == "Paid", 0, max(0, dateBetween(now(), prop("Due date"), "days")))'
        ),
        "Overdue flag": formula(
          'ifs(prop("Status") == "Paid", "", prop("Days overdue") > 14, "🔴 " + format(prop("Days overdue")) + "d overdue", prop("Days overdue") > 0, "🟡 " + format(prop("Days overdue")) + "d overdue", true, "🟢 Current")'
        ),
        "Reference": text(),
        Attachments: filesProp(),
      },
      seed: [
        { name: "October retainer — Northwind", props: { Status: "Sent" } },
        { name: "Component audit — Kestrel", props: { Status: "Draft" } },
      ],
    },
    {
      ref: "lineItems",
      title: "Line Items",
      icon: "➕",
      isInline: true,
      properties: {
        Name: title(),
        Description: text(),
        Quantity: num("number"),
        "Unit price": num("dollar"),
        Invoice: relation("invoices"),
        "Line total": formula('prop("Quantity") * prop("Unit price")'),
        Order: num("number"),
      },
      seed: [
        { name: "Component library build", props: { Quantity: 1, "Unit price": 6400 } },
        { name: "Design review hours", props: { Quantity: 8, "Unit price": 145 } },
      ],
    },
  ],
  views: [
    { on: "invoices", name: "By status", type: "board", configuration: { type: "board", card_layout: "comfortable" } },
    {
      on: "invoices",
      name: "Overdue",
      type: "table",
      filter: filterProperty("Overdue flag", "string", { contains: "overdue" }),
      sorts: [{ property: "Days overdue", direction: "descending" }],
    },
    {
      on: "invoices",
      name: "Revenue by month",
      type: "chart",
      configuration: {
        type: "chart",
        chart_type: "column",
        x_axis: { type: "date", property_name: "Issue date", date_grouping: "month" },
        y_axis: { aggregator: "sum", property_name: "Grand total" },
        color_theme: "green",
        show_data_labels: true,
        height: "medium",
      },
    },
    { on: "invoices", name: "Issue calendar", type: "calendar", configuration: { type: "calendar", calendar_by: "Issue date" } },
    { on: "clients", name: "Clients", type: "table" },
    { on: "lineItems", name: "All line items", type: "table" },
  ],
  pages: [
    {
      title: "Invoice page layout",
      icon: "🖨️",
      blocks: [
        paragraph([
          t("Put this in the "),
          t("Invoices", { code: true }),
          t(" page body template. Column layouts survive export to PDF, which a table alone does not."),
        ]),
        columns(
          [
            heading(3, "From"),
            paragraph([t("Your business name")]),
            paragraph([t("Address line")]),
            paragraph([t("Tax ID")]),
          ],
          [
            heading(3, "Bill to"),
            callout([t("Use a linked mention of the Client property so the address is never typed twice.")], "🔗", "gray_background"),
          ],
          [
            heading(3, "Details"),
            paragraph([t("Invoice no.")]),
            paragraph([t("Issued")]),
            paragraph([t("Due")]),
            paragraph([t("Terms")]),
          ]
        ),
        divider(),
        heading(3, "Line items"),
        paragraph([t("Embed the Line Items database here as a linked view, filtered to this invoice, showing Name, Quantity, Unit price and Line total.")]),
        divider(),
        columns(
          [paragraph([t("Payment instructions, bank details, and a thank-you line.")])],
          [
            paragraph([t("Subtotal", { bold: true })]),
            paragraph([t("Tax", { bold: true })]),
            paragraph([t("Total due", { bold: true })]),
          ]
        ),
      ],
    },
  ],
  manual: [
    {
      title: "Button: “Duplicate for next month”",
      reason: BUTTON_LIMITATION,
      steps: [
        "Invoices → ••• → Property → Button, name it “Duplicate for next month”.",
        "Action 1: Add page to → Invoices. Set Client to this page's Client, Status to Draft, Issue date to Today.",
        "Action 2: Open the new page, so you can paste last month's line items.",
        "Notion buttons cannot copy related rows, so line items are the one manual step.",
      ],
    },
    {
      title: "Automation: mark Sent invoices Overdue",
      reason: AUTOMATION_LIMITATION,
      steps: [
        "Invoices → Automations → New automation.",
        "Trigger: Due date is before Today (Notion evaluates date triggers daily).",
        "Condition: Status is Sent.",
        "Action: set Status to Overdue.",
        "Second automation: when Status becomes Paid, set Paid date to Today.",
      ],
    },
  ],
};

/* ================================================================== */
/* JOB APPLICATION TRACKER                                             */
/* ================================================================== */

export const jobTracker: Recipe = {
  id: "job-tracker",
  summary:
    "Companies and Applications with stage-age formulas, a follow-up view that surfaces silence, and outreach / debrief / offer templates.",
  databases: [
    {
      ref: "companies",
      title: "Companies",
      icon: "🏢",
      properties: {
        Name: title(),
        Website: url(),
        Size: sel([
          { name: "1–10", color: "gray" },
          { name: "11–50", color: "blue" },
          { name: "51–200", color: "green" },
          { name: "201–1000", color: "yellow" },
          { name: "1000+", color: "purple" },
        ]),
        Industry: sel([
          { name: "Software", color: "blue" },
          { name: "Finance", color: "green" },
          { name: "Agency", color: "yellow" },
          { name: "Nonprofit", color: "pink" },
          { name: "Public sector", color: "purple" },
        ]),
        "Salary band": text(),
        Remote: sel([
          { name: "Remote", color: "green" },
          { name: "Hybrid", color: "yellow" },
          { name: "Onsite", color: "red" },
        ]),
        "Would I enjoy this?": sel([
          { name: "1", color: "red" },
          { name: "2", color: "orange" },
          { name: "3", color: "yellow" },
          { name: "4", color: "blue" },
          { name: "5", color: "green" },
        ]),
        Applications: relation("applications", { twoWay: true, syncedName: "Company" }),
        Notes: text(),
      },
      seed: [{ name: "Example Studio", props: { Remote: "Hybrid", Size: "51–200" } }],
    },
    {
      ref: "applications",
      title: "Applications",
      icon: "🧳",
      properties: {
        Name: title(),
        Role: text(),
        Stage: status([
          { name: "Researched", color: "gray", group: "To-do" },
          { name: "Applied", color: "blue", group: "To-do" },
          { name: "Screening", color: "yellow", group: "In progress" },
          { name: "Interviewing", color: "orange", group: "In progress" },
          { name: "Offer", color: "purple", group: "In progress" },
          { name: "Accepted", color: "green", group: "Complete" },
          { name: "Rejected", color: "red", group: "Complete" },
          { name: "Withdrawn", color: "gray", group: "Complete" },
        ]),
        Company: relation("companies"),
        "Applied on": date(),
        "Last contact": date(),
        "Next step": text(),
        "Interview date": date(),
        Location: text(),
        "Contact person": text(),
        Source: sel([
          { name: "Referral", color: "green" },
          { name: "Job board", color: "blue" },
          { name: "Direct", color: "purple" },
          { name: "Recruiter", color: "yellow" },
        ]),
        "Days since contact": formula(
          'if(empty(prop("Last contact")), dateBetween(now(), prop("Applied on"), "days"), dateBetween(now(), prop("Last contact"), "days"))'
        ),
        "Follow up": formula(
          'ifs(prop("Stage") == "Accepted" or prop("Stage") == "Rejected", "", prop("Days since contact") > 10, "🔴 Chase now", prop("Days since contact") > 5, "🟡 Nudge", true, "🟢 Recent")'
        ),
        "Stage age (days)": formula('dateBetween(now(), prop("Applied on"), "days")'),
        "Interview scheduled": formula('if(empty(prop("Interview date")), false, prop("Interview date") >= now())'),
      },
      seed: [
        { name: "Example Studio — Senior Frontend", props: { Stage: "Interviewing", Source: "Referral" } },
      ],
    },
  ],
  views: [
    { on: "applications", name: "Pipeline", type: "board", configuration: { type: "board", card_layout: "comfortable" } },
    {
      on: "applications",
      name: "Follow up",
      type: "table",
      filter: filterProperty("Follow up", "string", { contains: "🔴" }),
      sorts: [{ property: "Days since contact", direction: "descending" }],
    },
    {
      on: "applications",
      name: "Interviews",
      type: "calendar",
      configuration: { type: "calendar", calendar_by: "Interview date" },
      filter: filterProperty("Interview scheduled", "checkbox", { equals: true }),
    },
    {
      on: "applications",
      name: "Active",
      type: "list",
      filter: filterProperty("Stage", "group_does_not_equal", "Complete"),
      sorts: [{ property: "Last contact", direction: "descending" }],
    },
    { on: "companies", name: "Company shortlist", type: "gallery", configuration: { type: "gallery", card_layout: "cover_dominant" } },
  ],
  pages: [
    {
      title: "Templates",
      icon: "✉️",
      blocks: [
        toggle([t("Cold outreach")], [
          paragraph([t("Subject: ", { bold: true }), t("<role> — <one specific thing about their product>")]),
          paragraph([t("Hi <name>,")]),
          paragraph([t("<Two sentences: what you noticed about them, and the specific problem you have solved that matches. No preamble, no flattery paragraph.>")]),
          paragraph([t("<One sentence on the most relevant thing you have shipped, with a number in it.>")]),
          paragraph([t("Would a 20-minute call next week be useful? I am free <two concrete slots>.")]),
          paragraph([t("<Name>")]),
        ]),
        toggle([t("Interview debrief — fill within an hour")], [
          heading(3, "What they asked"),
          bullet([t("Question 1 — how I answered — what I would answer now")]),
          heading(3, "What I learned about the role"),
          bullet([t("Real scope, real team size, real manager")]),
          heading(3, "Signals"),
          simpleTable([["Signal", "Positive / negative", "Evidence"]]),
          heading(3, "Follow-up"),
          todo([t("Send thank-you within 24 hours")]),
          todo([t("Log Last contact on the application")]),
        ]),
        toggle([t("Offer comparison")], [
          simpleTable([
            ["", "Offer A", "Offer B"],
            ["Base", "", ""],
            ["Equity / bonus", "", ""],
            ["Remote policy", "", ""],
            ["Manager, and would I work for them again?", "", ""],
            ["What I would learn", "", ""],
            ["Commute and hours per week", "", ""],
            ["Weighted score (1–5 × weight)", "", ""],
          ]),
        ]),
      ],
    },
  ],
  manual: [
    {
      title: "Automation: nudge yourself to follow up",
      reason: AUTOMATION_LIMITATION,
      steps: [
        "Applications → Automations → New automation.",
        "Trigger: Last contact is more than 7 days ago (use a date-based trigger, or a recurring daily check).",
        "Condition: Stage is not in the Complete group.",
        "Action: add a comment “Chase today”, and optionally a Notion reminder on Next step.",
      ],
    },
    {
      title: "Recurring template: weekly job-search review",
      reason: RECURRING_LIMITATION,
      steps: [
        "Create a “Weekly review” database template with linked views: Follow up, Interviews (next 14 days), Pipeline.",
        "Template ••• → Repeat → Every Sunday at 18:00.",
        "Body prompt: how many applications, how many conversations, what is the conversion rate, and what changes next week.",
      ],
    },
  ],
};
