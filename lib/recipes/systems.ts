import {
  bookmark,
  bullet,
  callout,
  chk,
  code,
  columns,
  compoundFilter,
  createdTime,
  date,
  defaultStatus,
  divider,
  embedUrl,
  filesProp,
  filterProperty,
  formula,
  heading,
  multi,
  num,
  numbered,
  paragraph,
  person,
  quote,
  relation,
  rich,
  rollup,
  sel,
  simpleTable,
  status,
  syncedBlock,
  t,
  tableOfContents,
  text,
  title,
  todo,
  toggle,
  uniqueId,
  url,
} from "@/lib/notion/schema";
import {
  AUTOMATION_LIMITATION,
  BUTTON_LIMITATION,
  RECURRING_LIMITATION,
  SYNCED_BLOCK_LIMITATION,
  type Recipe,
} from "./types";

/* ================================================================== */
/* MEETING NOTES OS                                                    */
/* ================================================================== */

export const meetingNotesOs: Recipe = {
  id: "meeting-notes-os",
  summary:
    "A Meetings data source with a real page-body template, action items in their own data source, and a follow-up view that never loses a decision.",
  databases: [
    {
      ref: "meetings",
      title: "Meetings",
      icon: "📝",
      properties: {
        Name: title(),
        Type: sel([
          { name: "1:1", color: "green" },
          { name: "Team", color: "blue" },
          { name: "Project", color: "purple" },
          { name: "Client", color: "yellow" },
          { name: "Interview", color: "pink" },
          { name: "Workshop", color: "orange" },
        ]),
        Date: date(),
        Attendees: person(),
        Status: status([
          { name: "Scheduled", color: "gray", group: "To-do" },
          { name: "Happening", color: "yellow", group: "In progress" },
          { name: "Notes written", color: "blue", group: "In progress" },
          { name: "Actions closed", color: "green", group: "Complete" },
          { name: "Cancelled", color: "red", group: "Complete" },
        ]),
        Project: relation("projects", { twoWay: true, syncedName: "Meetings" }),
        "Action items": relation("actions", { twoWay: true, syncedName: "Meeting" }),
        Agenda: text(),
        Decisions: text(),
        Recording: url(),
        Attachments: filesProp(),
        "Open actions": rollup("Action items", "Done", "unchecked"),
        "All actions": rollup("Action items", "Name", "count_values"),
        "Actions closed": formula(
          'if(prop("All actions") == 0, "n/a", format(prop("All actions") - prop("Open actions")) + "/" + format(prop("All actions")))'
        ),
        "Is overdue": formula(
          'if(and(prop("Date") < now(), prop("Status") == "Scheduled"), "🔴 Notes not written", "")'
        ),
        Created: createdTime(),
      },
      seed: [
        { name: "Weekly team sync", props: { Type: "Team", Status: "Notes written" } },
        { name: "1:1 · Dana", props: { Type: "1:1" } },
      ],
    },
    {
      ref: "actions",
      title: "Action Items",
      icon: "✅",
      properties: {
        Name: title(),
        Owner: person(),
        Due: date(),
        Done: chk(),
        Priority: sel([
          { name: "High", color: "red" },
          { name: "Medium", color: "yellow" },
          { name: "Low", color: "gray" },
        ]),
        Meeting: relation("meetings"),
        Context: text(),
        "Due state": formula(
          'ifs(prop("Done"), "✅ Done", empty(prop("Due")), "⚪ No date", prop("Due") < now(), "🔴 Overdue", dateBetween(prop("Due"), now(), "days") == 0, "🟠 Today", true, "🟢 " + format(dateBetween(prop("Due"), now(), "days")) + "d")'
        ),
      },
      seed: [
        { name: "Send the revised scope to the client", props: { Priority: "High", Done: false } },
        { name: "Book the offsite venue", props: { Priority: "Medium" } },
      ],
    },
    {
      ref: "projects",
      title: "Projects",
      icon: "📁",
      properties: {
        Name: title(),
        Status: defaultStatus(),
        Owner: person(),
        Due: date(),
        Meetings: relation("meetings"),
        "Meeting count": rollup("Meetings", "Name", "count_values"),
      },
      seed: [{ name: "Component registry v2" }, { name: "Q4 launch" }],
    },
  ],
  views: [
    {
      on: "meetings",
      name: "Calendar",
      type: "calendar",
      configuration: { type: "calendar", calendar_by: "Date" },
    },
    {
      on: "meetings",
      name: "Notes owed",
      type: "table",
      filter: filterProperty("Is overdue", "string", { does_not_equal: "" }),
      sorts: [{ property: "Date", direction: "ascending" }],
    },
    {
      on: "meetings",
      name: "By type",
      type: "board",
      configuration: {
        type: "board",
        group_by: { type: "select", property_name: "Type", sort: { type: "manual" } },
      },
    },
    {
      on: "actions",
      name: "My open actions",
      type: "table",
      filter: compoundFilter("and", [
        filterProperty("Done", "checkbox", { equals: false }),
        filterProperty("Owner", "person", { contains: "me" }),
      ]),
      sorts: [{ property: "Due", direction: "ascending" }],
    },
    {
      on: "actions",
      name: "Overdue",
      type: "list",
      filter: filterProperty("Due state", "string", { contains: "Overdue" }),
    },
    {
      on: "meetings",
      name: "Meetings per project",
      type: "chart",
      configuration: {
        type: "chart",
        chart_type: "donut",
        x_axis: { type: "select", property_name: "Type", sort: { type: "manual" } },
        y_axis: { aggregator: "count" },
        color_theme: "yellow",
        height: "medium",
      },
    },
  ],
  pages: [
    {
      title: "Meeting page template body",
      icon: "📄",
      blocks: [
        callout(
          [
            t("This is the body Notion inserts when you apply the “Meeting” database template. ", { bold: true }),
            t("Every block below is a real block type: the installer can build the equivalent page directly through Append block children."),
          ],
          "📄",
          "blue_background"
        ),
        columns(
          [
            paragraph([t("Date", { bold: true })]),
            paragraph([t("@Attendees")]),
          ],
          [
            paragraph([t("Type", { bold: true })]),
            paragraph([t("Project", { bold: true })]),
          ]
        ),
        divider(),
        heading(2, "Agenda"),
        numbered([t("…")]),
        heading(2, "Notes"),
        toggle([t("Topic 1")], [paragraph([t("Notes")]), bullet([t("Detail")])]),
        heading(2, "Decisions"),
        callout([t("Record the decision and the reason, not just the outcome. Six months from now the reason is the only part that is useful.")], "📌", "yellow_background"),
        bullet([t("Decision, why, who decided")]),
        heading(2, "Action items"),
        paragraph([t("Embed the Action Items database as a linked view filtered to this meeting. Then each row you add is a real tracked action with an owner and a due date.")]),
        todo([t("Action, @owner, due date")]),
        divider(),
        heading(3, "Carry-over"),
        paragraph([t("Anything unresolved from the last meeting with this group. Linked view: same Type, same Attendees, Status ≠ Actions closed.")]),
      ],
    },
  ],
  manual: [
    {
      title: "Database template: “Meeting”",
      reason:
        "The API can create a page with this body and can apply an existing template when creating a page, but it cannot author the template itself.",
      steps: [
        "Meetings → the ▾ beside New → + New template.",
        "Name it “Meeting”. Set Type and Status = Scheduled as property defaults.",
        "Paste the body shown on this page: Notion keeps the headings, toggles and to-dos as real blocks.",
        "In the Action items section, type /linked and choose Action Items, filtered to Meeting = this page (Relative link → Meeting).",
        "Template ••• → Set as default.",
      ],
    },
    {
      title: "Button: “New meeting”",
      reason: BUTTON_LIMITATION,
      steps: [
        "On your Meetings home page: /button.",
        "Action 1: Add page to → Meetings. Apply the “Meeting” template. Set Date to Today, Type to Team.",
        "Action 2: Open page → the page created in step 1.",
        "Label it “+ New meeting” and give it an icon.",
      ],
    },
    {
      title: "Automation: close the loop after the meeting",
      reason: AUTOMATION_LIMITATION,
      steps: [
        "Meetings → Automations → New automation.",
        "Trigger: Date is before Today. Condition: Status is Scheduled.",
        "Action: do not set Status to “Notes written”. Add a comment @mentioning the first attendee: “Notes owed.”",
        "Second automation: when every Action item is Done, set Status to “Actions closed”. Notion cannot express “all related rows”, so use a weekly recurring review instead.",
      ],
    },
  ],
};

/* ================================================================== */
/* CONTENT CALENDAR                                                    */
/* ================================================================== */

export const contentCalendar: Recipe = {
  id: "content-calendar",
  summary:
    "Ideas and Pieces with a promote-to-piece relation, an editorial calendar, a channel chart, and a public intake form.",
  databases: [
    {
      ref: "ideas",
      title: "Ideas",
      icon: "💡",
      properties: {
        Name: title(),
        Score: sel([
          { name: "A: ship it", color: "green" },
          { name: "B: needs work", color: "blue" },
          { name: "C: maybe", color: "yellow" },
          { name: "D: no", color: "red" },
        ]),
        Angle: multi([
          { name: "How-to", color: "blue" },
          { name: "Contrarian", color: "red" },
          { name: "Data", color: "green" },
          { name: "Story", color: "purple" },
          { name: "Comparison", color: "yellow" },
        ]),
        Audience: sel([
          { name: "Beginner", color: "green" },
          { name: "Practitioner", color: "blue" },
          { name: "Decision maker", color: "purple" },
        ]),
        Source: sel([
          { name: "Support question", color: "yellow" },
          { name: "Sales call", color: "green" },
          { name: "Search term", color: "blue" },
          { name: "Shower thought", color: "pink" },
        ]),
        "Keyword / search volume": text(),
        Piece: relation("pieces", { twoWay: true, syncedName: "Source idea" }),
        Promoted: chk(),
        Notes: text(),
        Submitted: createdTime(),
      },
      seed: [
        { name: "Why Notion HTML blocks change component design", props: { Score: "A: ship it", Angle: ["Contrarian", "Data"] } },
        { name: "The three ways to get a component into Notion", props: { Score: "A: ship it", Angle: ["How-to"] } },
      ],
    },
    {
      ref: "pieces",
      title: "Pieces",
      icon: "📣",
      properties: {
        Name: title(),
        Status: status([
          { name: "Brief", color: "gray", group: "To-do" },
          { name: "Drafting", color: "blue", group: "In progress" },
          { name: "Review", color: "yellow", group: "In progress" },
          { name: "Scheduled", color: "purple", group: "In progress" },
          { name: "Published", color: "green", group: "Complete" },
          { name: "Killed", color: "red", group: "Complete" },
        ]),
        Channel: multi([
          { name: "Blog", color: "blue" },
          { name: "Newsletter", color: "yellow" },
          { name: "LinkedIn", color: "purple" },
          { name: "X", color: "gray" },
          { name: "YouTube", color: "red" },
          { name: "Docs", color: "green" },
        ]),
        Format: sel([
          { name: "Article", color: "blue" },
          { name: "Tutorial", color: "green" },
          { name: "Case study", color: "purple" },
          { name: "Changelog", color: "gray" },
          { name: "Video", color: "red" },
        ]),
        Author: person(),
        Reviewer: person(),
        "Publish date": date(),
        "Last worked": date(),
        "Live URL": url(),
        Cover: filesProp(),
        "Source idea": relation("ideas"),
        "Funnel stage": sel([
          { name: "Awareness", color: "blue" },
          { name: "Consideration", color: "yellow" },
          { name: "Conversion", color: "green" },
        ]),
        "Words / length": num("number_with_commas"),
        "Days to publish": formula(
          'if(empty(prop("Publish date")), 0, dateBetween(prop("Publish date"), now(), "days"))'
        ),
        "Ready": formula(
          'if(and(prop("Status") == "Scheduled", not(empty(prop("Publish date"))), prop("Days to publish") <= 7), "🟢 Ready", "")'
        ),
        "Stalled": formula(
          'if(and(prop("Status") != "Published", not(empty(prop("Last worked"))), dateBetween(now(), prop("Last worked"), "days") > 10), "⚠️ Stalled " + format(dateBetween(now(), prop("Last worked"), "days")) + "d", "")'
        ),
        "Week": formula('format(prop("Publish date"))'),
      },
      seed: [
        { name: "Component registries, explained for Notion people", props: { Status: "Drafting", Channel: ["Blog", "Newsletter"], Format: "Article" } },
        { name: "Build a KPI strip that runs inside a Notion page", props: { Status: "Scheduled", Channel: ["YouTube"], Format: "Tutorial" } },
      ],
    },
  ],
  views: [
    {
      on: "pieces",
      name: "Editorial calendar",
      type: "calendar",
      configuration: { type: "calendar", calendar_by: "Publish date" },
    },
    { on: "pieces", name: "Pipeline", type: "board", configuration: { type: "board", card_layout: "cover_dominant" } },
    {
      on: "pieces",
      name: "Covers",
      type: "gallery",
      configuration: { type: "gallery", card_layout: "cover_dominant", cover_size: "medium" },
      filter: filterProperty("Status", "status", { equals: "Published" }),
    },
    {
      on: "pieces",
      name: "By channel",
      type: "chart",
      configuration: {
        type: "chart",
        chart_type: "column",
        x_axis: { type: "date", property_name: "Publish date", date_grouping: "month" },
        y_axis: { aggregator: "count" },
        color_theme: "pink",
        show_data_labels: true,
        height: "medium",
      },
    },
    {
      on: "ideas",
      name: "Submit an idea",
      type: "form",
      configuration: {
        type: "form",
        properties: [
          { property_name: "Name", visible: true, label: "Your idea", required: true },
          { property_name: "Angle", visible: true, label: "What kind of piece?" },
          { property_name: "Audience", visible: true, label: "Who is it for?" },
          { property_name: "Notes", visible: true, label: "Anything else", required: false },
        ],
        submit_label: "Send it over",
      },
    },
    { on: "ideas", name: "Idea backlog", type: "table", sorts: [{ property: "Score", direction: "ascending" }] },
    {
      on: "pieces",
      name: "Stalled",
      type: "table",
      filter: filterProperty("Stalled", "string", { contains: "Stalled" }),
    },
  ],
  pages: [
    {
      title: "Editorial home",
      icon: "🗞️",
      blocks: [
        tableOfContents(),
        heading(2, "This week"),
        paragraph([t("Linked view of Pieces filtered to Ready, plus anything Stalled. Two lists, no third.")]),
        heading(2, "The calendar"),
        paragraph([t("Embed the Editorial calendar view full-width. Publish dates are the contract; everything else is negotiable.")]),
        heading(2, "Idea intake"),
        callout(
          [
            t("Publish the form view to a public URL and put it in your footer. ", { bold: true }),
            t("Support questions are the best idea source you have: they are pre-qualified by the fact that someone asked."),
          ],
          "💡",
          "yellow_background"
        ),
        divider(),
        heading(3, "Scoring an idea"),
        simpleTable([
          ["Score", "Meaning", "Action"],
          ["A", "Specific audience, specific problem, we have proof", "Brief this week"],
          ["B", "Right topic, thin evidence", "Find the data or the story first"],
          ["C", "Interesting to us, unclear to a reader", "Park it"],
          ["D", "We have said it, or nobody needs it", "Delete it"],
        ]),
      ],
    },
  ],
  manual: [
    {
      title: "Recurring template: weekly editorial slots",
      reason: RECURRING_LIMITATION,
      steps: [
        "Pieces → ▾ beside New → + New template → “Weekly slot”.",
        "Set Status to Brief, Publish date to next Monday, Channel to Newsletter.",
        "Template ••• → Repeat → Every Monday at 08:00.",
        "Create four of these if you publish weekly on four channels; one template cannot vary its own properties by weekday.",
      ],
    },
    {
      title: "Automation: tell the reviewer when a draft is ready",
      reason: AUTOMATION_LIMITATION,
      steps: [
        "Pieces → Automations → New automation.",
        "Trigger: Status changes to Review.",
        "Action: add a comment @mentioning Reviewer.",
        "Second automation: when Status becomes Published and Live URL is empty, comment “Add the URL”.",
      ],
    },
  ],
};

/* ================================================================== */
/* PARA LIFE OS                                                        */
/* ================================================================== */

export const paraLifeOs: Recipe = {
  id: "para-life-os",
  summary:
    "Projects, Areas, Resources, Notes and Tasks, cross-linked so nothing is orphaned, with a home dashboard built from synced blocks.",
  databases: [
    {
      ref: "projects",
      title: "Projects",
      icon: "🚀",
      properties: {
        Name: title(),
        Status: status([
          { name: "Someday", color: "gray", group: "To-do" },
          { name: "Next up", color: "blue", group: "To-do" },
          { name: "Active", color: "yellow", group: "In progress" },
          { name: "Blocked", color: "red", group: "In progress" },
          { name: "Done", color: "green", group: "Complete" },
          { name: "Archived", color: "gray", group: "Complete" },
        ]),
        Area: relation("areas", { twoWay: true, syncedName: "Projects" }),
        Owner: person(),
        Deadline: date(),
        Outcome: text("One sentence: what is true when this is finished?"),
        Tasks: relation("tasks", { twoWay: true, syncedName: "Project" }),
        Notes: relation("notes", { twoWay: true, syncedName: "Project" }),
        "Tasks done": rollup("Tasks", "Done", "checked"),
        "Tasks total": rollup("Tasks", "Name", "count_values"),
        "% complete": formula(
          'if(prop("Tasks total") == 0, 0, round(prop("Tasks done") / prop("Tasks total") * 100))'
        ),
        "Progress": formula(
          'slice("██████████", 0, round(prop("% complete") / 10)) + " " + format(prop("% complete")) + "%"'
        ),
        "Days to deadline": formula(
          'if(empty(prop("Deadline")), 0, dateBetween(prop("Deadline"), now(), "days"))'
        ),
        "Health": formula(
          'ifs(prop("Status") == "Blocked", "🔴 Blocked", prop("Days to deadline") < 0 and prop("Status") != "Done", "🔴 Overdue", prop("Days to deadline") < 7 and prop("% complete") < 70, "🟡 Tight", prop("Status") == "Active", "🟢 On it", true, "⚪")'
        ),
      },
      seed: [
        { name: "Launch the component registry", props: { Status: "Active" } },
        { name: "Rewrite the pricing page", props: { Status: "Next up" } },
      ],
    },
    {
      ref: "areas",
      title: "Areas",
      icon: "🧭",
      properties: {
        Name: title(),
        Standard: text("What does 'good enough' look like here, indefinitely?"),
        Owner: person(),
        "Review cadence": sel([
          { name: "Weekly", color: "green" },
          { name: "Monthly", color: "blue" },
          { name: "Quarterly", color: "purple" },
        ]),
        "Last reviewed": date(),
        Projects: relation("projects"),
        Notes: relation("notes", { twoWay: true, syncedName: "Area" }),
        Resources: relation("resources", { twoWay: true, syncedName: "Area" }),
        "Active projects": rollup("Projects", "Status", "count"),
        "Review due": formula(
          'ifs(prop("Review cadence") == "Weekly", dateBetween(now(), prop("Last reviewed"), "days") > 7, prop("Review cadence") == "Monthly", dateBetween(now(), prop("Last reviewed"), "days") > 31, true, dateBetween(now(), prop("Last reviewed"), "days") > 92)'
        ),
      },
      seed: [
        { name: "Health", props: { Standard: "Move four times a week, sleep seven hours.", "Review cadence": "Weekly" } },
        { name: "Finances", props: { Standard: "Every expense categorised within a week.", "Review cadence": "Monthly" } },
        { name: "Craft", props: { Standard: "Ship something public every month.", "Review cadence": "Monthly" } },
      ],
    },
    {
      ref: "resources",
      title: "Resources",
      icon: "📚",
      properties: {
        Name: title(),
        Type: sel([
          { name: "Article", color: "blue" },
          { name: "Book", color: "purple" },
          { name: "Tool", color: "green" },
          { name: "Course", color: "yellow" },
          { name: "Reference", color: "gray" },
          { name: "Template", color: "pink" },
        ]),
        Link: url(),
        Topic: multi([
          { name: "Design", color: "pink" },
          { name: "Engineering", color: "blue" },
          { name: "Writing", color: "yellow" },
          { name: "Business", color: "green" },
          { name: "Notion", color: "purple" },
        ]),
        Area: relation("areas"),
        Rating: sel([
          { name: "★", color: "gray" },
          { name: "★★", color: "yellow" },
          { name: "★★★", color: "orange" },
          { name: "★★★★", color: "green" },
        ]),
        "Read / used": chk(),
        Summary: text(),
      },
      seed: [
        { name: "Notion API: Working with views", props: { Type: "Reference", Topic: ["Notion", "Engineering"], Rating: "★★★★" } },
        { name: "Building a second brain", props: { Type: "Book", Topic: ["Writing"] } },
      ],
    },
    {
      ref: "notes",
      title: "Notes",
      icon: "🗒️",
      properties: {
        Name: title(),
        Captured: createdTime(),
        Kind: sel([
          { name: "Fleeting", color: "gray" },
          { name: "Literature", color: "blue" },
          { name: "Permanent", color: "green" },
          { name: "Meeting", color: "yellow" },
        ]),
        Project: relation("projects"),
        Area: relation("areas"),
        Tags: multi([
          { name: "idea", color: "purple" },
          { name: "question", color: "yellow" },
          { name: "quote", color: "pink" },
          { name: "decision", color: "green" },
        ]),
        "Process this": chk(),
      },
      seed: [{ name: "Registry items should be one file, two delivery channels", props: { Kind: "Permanent", Tags: ["idea"] } }],
    },
    {
      ref: "tasks",
      title: "Tasks",
      icon: "✅",
      properties: {
        Name: title(),
        Done: chk(),
        Due: date(),
        Effort: sel([
          { name: "2m", color: "gray" },
          { name: "15m", color: "blue" },
          { name: "1h", color: "yellow" },
          { name: "Half day", color: "orange" },
        ]),
        Project: relation("projects"),
        "Where": sel([
          { name: "Today", color: "green" },
          { name: "This week", color: "blue" },
          { name: "Later", color: "gray" },
        ]),
        "State": formula(
          'ifs(prop("Done"), "✅", empty(prop("Due")), "⚪", prop("Due") < now(), "🔴", dateBetween(prop("Due"), now(), "days") == 0, "🟠", true, "🟢")'
        ),
      },
      seed: [
        { name: "Draft the registry spec page", props: { Effort: "1h", Where: "Today", Done: false } },
        { name: "Renew domain", props: { Effort: "15m", Where: "This week" } },
      ],
    },
  ],
  views: [
    {
      on: "projects",
      name: "Active",
      type: "board",
      configuration: { type: "board", card_layout: "comfortable" },
      filter: filterProperty("Status", "status", { equals: "Active" }),
    },
    { on: "areas", name: "Areas", type: "gallery", configuration: { type: "gallery", card_layout: "cover_dominant" } },
    {
      on: "tasks",
      name: "Today",
      type: "list",
      filter: compoundFilter("and", [
        filterProperty("Done", "checkbox", { equals: false }),
        filterProperty("Where", "select", { equals: "Today" }),
      ]),
    },
    {
      on: "notes",
      name: "Inbox",
      type: "table",
      filter: filterProperty("Process this", "checkbox", { equals: true }),
      sorts: [{ property: "Captured", direction: "descending" }],
    },
    {
      on: "notes",
      name: "Quick capture",
      type: "form",
      configuration: {
        type: "form",
        properties: [
          { property_name: "Name", visible: true, label: "What's on your mind?", required: true },
          { property_name: "Kind", visible: true, label: "Type" },
          { property_name: "Tags", visible: true, label: "Tags" },
        ],
        submit_label: "Capture",
      },
    },
    { on: "resources", name: "Library", type: "table", sorts: [{ property: "Rating", direction: "ascending" }] },
    {
      on: "areas",
      name: "Needs a review",
      type: "table",
      filter: filterProperty("Review due", "checkbox", { equals: true }),
    },
  ],
  pages: [
    {
      title: "Home",
      icon: "🏠",
      blocks: [
        syncedBlock([
          columns(
            [heading(3, "🏠 Home"), paragraph([t("One entry point. Everything else is a linked view.")])],
            [paragraph([t("Today", { bold: true })]), paragraph([t("· linked view of Tasks → Today")])],
            [paragraph([t("Active", { bold: true })]), paragraph([t("· linked view of Projects → Active")])]
          ),
        ]),
        callout(
          [
            t("This header is a synced block. ", { bold: true }),
            t("Create it once, then duplicate it onto every dashboard page so navigation is consistent and editable from one place. "),
            t("The API can create the original; the duplicates are an app-side step."),
          ],
          "🔁",
          "blue_background"
        ),
        divider(),
        heading(2, "Today"),
        paragraph([t("Linked view: Tasks, filtered to Where = Today and Done is unchecked.")]),
        heading(2, "Active projects"),
        paragraph([t("Linked view: Projects, Status = Active, sorted by Days to deadline.")]),
        heading(2, "Capture"),
        bookmark("https://www.notion.so/", [t("Publish the Notes form view and link it here so mobile capture is one tap.")]),
        divider(),
        heading(2, "Weekly review"),
        numbered([t("Empty the Notes inbox. Every fleeting note becomes permanent, gets a project, or is deleted.")]),
        numbered([t("Walk every Active project. Is it still active? Move it to Someday or Done without guilt.")]),
        numbered([t("Check Areas with Review due. Update Last reviewed only if you actually looked.")]),
        numbered([t("Pick three tasks for Today, and only three.")]),
        quote([t("Archive is a status, not a place. Everything you have ever written stays searchable.")]),
      ],
    },
  ],
  manual: [
    {
      title: "Synced block duplicates across dashboards",
      reason: SYNCED_BLOCK_LIMITATION,
      steps: [
        "Build the header once on Home, inside a synced block.",
        "On every other dashboard page: type /synced and choose “Paste from elsewhere”, then pick the Home header.",
        "Editing any instance edits all of them. That is the whole point.",
      ],
    },
    {
      title: "Button: “Start my day”",
      reason: BUTTON_LIMITATION,
      steps: [
        "On Home: /button.",
        "Action 1: Add page to → Notes, Kind = Fleeting, Process this = checked (a blank capture line).",
        "Action 2: Open page → Home, so the Today view refreshes into focus.",
        "Action 3 (optional): show a confirmation with today's date.",
      ],
    },
    {
      title: "Recurring template: weekly review",
      reason: RECURRING_LIMITATION,
      steps: [
        "Create a “Reviews” database with Date and a body containing the four numbered steps above.",
        "Template ••• → Repeat → Every Sunday at 17:00.",
        "Inside the body, add linked views: Notes inbox, Projects active, Areas needs a review.",
      ],
    },
  ],
};

/* ================================================================== */
/* HABIT OS (NATIVE)                                                   */
/* ================================================================== */

export const habitOsNative: Recipe = {
  id: "habit-os-native",
  summary:
    "Habits and Daily Logs with streak and completion-rate formulas computed from your rows, so the data follows you across devices.",
  databases: [
    {
      ref: "habits",
      title: "Habits",
      icon: "🔁",
      properties: {
        Name: title(),
        Active: chk(),
        Frequency: sel([
          { name: "Daily", color: "green" },
          { name: "Weekdays", color: "blue" },
          { name: "3× per week", color: "yellow" },
          { name: "Weekly", color: "purple" },
        ]),
        "Times per week": num("number", "Used by the rate formula. Daily = 7, 3× = 3."),
        Emoji: text(),
        "Why": text("The reason survives the days when motivation does not."),
        "Started": date(),
        Logs: relation("logs", { twoWay: true, syncedName: "Habit" }),
        "Logs this month": rollup("Recent logs", "Completed", "count"),
        "Completed count": rollup("Logs", "Completed", "checked"),
        "Total logs": rollup("Logs", "Name", "count_values"),
        "All-time rate": formula(
          'if(prop("Total logs") == 0, 0, round(prop("Completed count") / prop("Total logs") * 100))'
        ),
        "Best streak": num("number", "Maintained by the streak formula on Logs, or by hand weekly."),
        "Status": formula(
          'ifs(not(prop("Active")), "⏸ Paused", prop("All-time rate") >= 80, "🔥 Strong", prop("All-time rate") >= 50, "🌱 Building", true, "🧊 Fragile")'
        ),
      },
      seed: [
        { name: "Read 20 pages", props: { Active: true, Frequency: "Daily", "Times per week": 7, Emoji: "📖" } },
        { name: "Strength training", props: { Active: true, Frequency: "3× per week", "Times per week": 3, Emoji: "🏋️" } },
        { name: "No screens after 22:00", props: { Active: true, Frequency: "Daily", "Times per week": 7, Emoji: "🌙" } },
      ],
    },
    {
      ref: "logs",
      title: "Daily Logs",
      icon: "🗓️",
      properties: {
        Name: title(),
        Date: date(),
        Habit: relation("habits"),
        Completed: chk(),
        "Reps / amount": num("number"),
        Note: text(),
        Weekday: formula('formatDate(prop("Date"), "ddd")'),
        "Is today": formula('dateBetween(prop("Date"), now(), "days") == 0'),
        "Week number": formula('formatDate(prop("Date"), "wo")'),
        Created: createdTime(),
      },
      seed: [],
    },
  ],
  views: [
    {
      on: "habits",
      name: "Habit dashboard",
      type: "dashboard",
    },
    {
      on: "habits",
      name: "Active habits",
      type: "gallery",
      configuration: { type: "gallery", card_layout: "cover_dominant" },
      filter: filterProperty("Active", "checkbox", { equals: true }),
    },
    {
      on: "habits",
      name: "Completion by habit",
      type: "chart",
      configuration: {
        type: "chart",
        chart_type: "bar",
        x_axis: { type: "title", property_name: "Name" },
        y_axis: { aggregator: "average", property_name: "All-time rate" },
        color_theme: "green",
        color_by_value: true,
        show_data_labels: true,
        height: "medium",
      },
    },
    {
      on: "logs",
      name: "Calendar",
      type: "calendar",
      configuration: { type: "calendar", calendar_by: "Date" },
      filter: filterProperty("Completed", "checkbox", { equals: true }),
    },
    {
      on: "logs",
      name: "Today",
      type: "table",
      filter: filterProperty("Is today", "checkbox", { equals: true }),
    },
    {
      on: "logs",
      name: "Logs per week",
      type: "chart",
      configuration: {
        type: "chart",
        chart_type: "line",
        x_axis: { type: "date", property_name: "Date", date_grouping: "week" },
        y_axis: { aggregator: "count" },
        color_theme: "blue",
        height: "medium",
      },
    },
  ],
  pages: [
    {
      title: "Habit OS",
      icon: "🔥",
      blocks: [
        callout(
          [
            t("Why a database instead of a widget? ", { bold: true }),
            t(
              "A widget's streak lives in one browser's localStorage. These formulas live in your workspace: they follow you to your phone, they are visible to a coach, and you can roll them up into a quarterly life review."
            ),
          ],
          "🔥",
          "green_background"
        ),
        heading(2, "The loop"),
        numbered([t("Press “Log today” once. It creates one Daily Log row per active habit, dated today.")]),
        numbered([t("Tick Completed on the rows you did. Leave the rest unchecked: an unchecked row is data, not failure.")]),
        numbered([t("On Sunday, look at the Completion by habit chart. Anything under 50% for three weeks gets its frequency reduced, not its willpower increased.")]),
        divider(),
        heading(2, "The formulas"),
        toggle([t("All-time rate")], [code('round(prop("Completed count") / prop("Total logs") * 100)')]),
        toggle([t("Weekday, for pattern spotting")], [code('formatDate(prop("Date"), "ddd")')]),
        toggle([t("Is today, for the Today view")], [code('dateBetween(prop("Date"), now(), "days") == 0')]),
        callout(
          [
            t("A true current-streak formula needs a self-referencing lookup across dated rows, which Notion formulas cannot express. ", { bold: true }),
            t("That is an honest limitation, not a missing feature, which is why the weekly chart does the motivating instead."),
          ],
          "⚠️",
          "yellow_background"
        ),
      ],
    },
  ],
  manual: [
    {
      title: "Button: “Log today”",
      reason: BUTTON_LIMITATION,
      steps: [
        "On the Habit OS page: /button.",
        "Action: Add page to → Daily Logs, once per active habit. Notion buttons cannot loop over related rows, so add one action per habit and delete the action when you pause a habit.",
        "Each action sets Date = Today, Habit = the matching habit, Completed = unchecked.",
        "For more than about six habits, use the recurring template below instead.",
      ],
    },
    {
      title: "Recurring template: daily log seeder",
      reason: RECURRING_LIMITATION,
      steps: [
        "Daily Logs → ▾ beside New → + New template → “Daily seed”.",
        "Set Date to Today as a default.",
        "Template ••• → Repeat → Every day at 06:00.",
        "This creates one row per day; pair it with a Habit select you set by hand, or create one template per habit each repeating daily.",
      ],
    },
    {
      title: "Widget views on the habit dashboard",
      reason:
        "Dashboard configuration is read-only. Create the dashboard, then add each widget as its own view with view_id pointing at it.",
      steps: [
        "POST /v1/views with type: \"dashboard\" and the Habits database's database_id.",
        "POST /v1/views with view_id = that dashboard for each widget: a Number widget (average All-time rate), a Bar chart (completion by habit), a Calendar (completed logs).",
        "Maximum 12 widgets, 4 per row.",
      ],
    },
  ],
};

/* ================================================================== */
/* CLIENT PORTAL                                                       */
/* ================================================================== */

export const clientPortal: Recipe = {
  id: "client-portal",
  summary:
    "A publishable client page: intake form, a client-filtered board of deliverables, a synced portal header, and a milestone countdown.",
  databases: [
    {
      ref: "clients",
      title: "Clients",
      icon: "🤝",
      properties: {
        Name: title(),
        Status: status([
          { name: "Onboarding", color: "blue", group: "To-do" },
          { name: "Active", color: "green", group: "In progress" },
          { name: "Paused", color: "yellow", group: "In progress" },
          { name: "Offboarded", color: "gray", group: "Complete" },
        ]),
        "Primary contact": person(),
        Email: { email: {} },
        "Portal URL": url(),
        "Kickoff date": date(),
        "Next milestone": date(),
        "Retainer": num("dollar"),
        Deliverables: relation("deliverables", { twoWay: true, syncedName: "Client" }),
        Requests: relation("intake", { twoWay: true, syncedName: "Client" }),
        "Open items": rollup("Deliverables", "Status", "count"),
        "Days to milestone": formula(
          'if(empty(prop("Next milestone")), 0, dateBetween(prop("Next milestone"), now(), "days"))'
        ),
      },
      seed: [{ name: "Northwind Logistics", props: { Status: "Active", Retainer: 6500 } }],
    },
    {
      ref: "deliverables",
      title: "Deliverables",
      icon: "📦",
      properties: {
        Name: title(),
        Status: status([
          { name: "Queued", color: "gray", group: "To-do" },
          { name: "In progress", color: "yellow", group: "In progress" },
          { name: "In client review", color: "blue", group: "In progress" },
          { name: "Changes requested", color: "orange", group: "In progress" },
          { name: "Delivered", color: "green", group: "Complete" },
        ]),
        Client: relation("clients"),
        Owner: person(),
        Due: date(),
        "Client visible": chk("Only deliverables with this ticked appear on the portal page."),
        Link: url(),
        Notes: text(),
        "Timeline": formula(
          'ifs(prop("Status") == "Delivered", "✅ Delivered", empty(prop("Due")), "⚪ No date", prop("Due") < now(), "🔴 Late", true, "🟢 Due " + formatDate(prop("Due"), "MMM D"))'
        ),
      },
      seed: [
        { name: "Brand refresh · round 1", props: { Status: "In client review", "Client visible": true } },
        { name: "Internal pricing model", props: { Status: "In progress", "Client visible": false } },
      ],
    },
    {
      ref: "intake",
      title: "Intake Requests",
      icon: "📥",
      properties: {
        Name: title(),
        Client: relation("clients"),
        Type: sel([
          { name: "New request", color: "blue" },
          { name: "Change request", color: "yellow" },
          { name: "Question", color: "gray" },
          { name: "Bug", color: "red" },
        ]),
        Priority: sel([
          { name: "Low", color: "gray" },
          { name: "Normal", color: "blue" },
          { name: "Urgent", color: "red" },
        ]),
        Detail: text(),
        Submitted: createdTime(),
        Status: defaultStatus(),
        Attachment: filesProp(),
        "Answer": text(),
      },
      seed: [],
    },
  ],
  views: [
    {
      on: "intake",
      name: "Client intake form",
      type: "form",
      configuration: {
        type: "form",
        properties: [
          { property_name: "Name", visible: true, label: "What do you need?", required: true },
          { property_name: "Type", visible: true, label: "Request type" },
          { property_name: "Priority", visible: true, label: "How urgent?" },
          { property_name: "Detail", visible: true, label: "Details", required: true },
          { property_name: "Attachment", visible: true, label: "Attach a file" },
        ],
        submit_label: "Send request",
      },
    },
    {
      on: "deliverables",
      name: "Portal board",
      type: "board",
      configuration: { type: "board", card_layout: "comfortable" },
      filter: compoundFilter("and", [
        filterProperty("Client visible", "checkbox", { equals: true }),
        filterProperty("Client", "relation", { contains: "REPLACE_WITH_CLIENT_PAGE_ID" }),
      ]),
    },
    {
      on: "deliverables",
      name: "Delivery timeline",
      type: "timeline",
      configuration: { type: "timeline" },
      filter: filterProperty("Client visible", "checkbox", { equals: true }),
    },
    { on: "deliverables", name: "Delivered gallery", type: "gallery", configuration: { type: "gallery", card_layout: "cover_dominant" } },
    { on: "clients", name: "All clients", type: "table" },
    { on: "intake", name: "Requests queue", type: "table", sorts: [{ property: "Submitted", direction: "descending" }] },
  ],
  pages: [
    {
      title: "Client portal page",
      icon: "🚪",
      blocks: [
        syncedBlock([
          columns(
            [
              heading(2, "👋 Welcome"),
              paragraph([t("Everything about our work together, in one place. Updated as it happens. No weekly status email.")]),
            ],
            [
              paragraph([t("Your contact", { bold: true })]),
              paragraph([t("@you")]),
              paragraph([t("Next milestone", { bold: true })]),
              paragraph([t("· linked Days to milestone")]),
            ]
          ),
        ]),
        divider(),
        heading(2, "Where things stand"),
        paragraph([t("Linked view: Deliverables → Portal board, filtered to this client and Client visible = checked.")]),
        callout(
          [t("Embed the Countdown widget here, pointed at the Next milestone date. It is the one thing clients actually look at.")],
          "⏳",
          "blue_background"
        ),
        embedUrl("https://example.com/widgets/countdown.html?label=Next%20milestone&to=2026-12-01"),
        divider(),
        heading(2, "Request something"),
        paragraph([t("Publish the Client intake form view and embed it here. Submitters need no Notion account.")]),
        heading(2, "What we have delivered"),
        paragraph([t("Linked view: Deliverables → Delivered gallery.")]),
        divider(),
        callout(
          [
            t("Before you publish: ", { bold: true }),
            t(
              "audit every linked view on this page. Anything not filtered to this client and not marked Client visible will leak. Publishing exposes the page body, not the properties of the rows, but a linked view shows whatever its filter allows."
            ),
          ],
          "🔒",
          "red_background"
        ),
      ],
    },
  ],
  manual: [
    {
      title: "Automation: notify on new intake",
      reason: AUTOMATION_LIMITATION,
      steps: [
        "Intake Requests → Automations → New automation.",
        "Trigger: Page created.",
        "Action: Send a Slack message to #client-requests with the Name, Client and Priority.",
        "Action: set Status to In progress and Owner to the account lead.",
      ],
    },
    {
      title: "Automation: tell the client when a deliverable lands",
      reason: AUTOMATION_LIMITATION,
      steps: [
        "Deliverables → Automations → New automation.",
        "Trigger: Status changes to “In client review”.",
        "Action: add a comment @mentioning the client's contact; if they are a guest on the page, they are notified by email.",
      ],
    },
    {
      title: "Publish the portal",
      reason:
        "Share settings and public publishing are workspace-level and not exposed on the pages API.",
      steps: [
        "Share → Publish, and enable “Allow duplicate as template” only if you want clients to copy the structure.",
        "Invite the client as a Guest on the portal page rather than on the whole workspace.",
        "Turn off comments if you do not want client comments landing in your notification feed.",
        "Put the Countdown widget embed in the page before publishing, so the milestone date is visible immediately.",
      ],
    },
  ],
};

/* ================================================================== */
/* AUTOMATION STARTER PACK                                             */
/* ================================================================== */

export const automationStarter: Recipe = {
  id: "automation-starter",
  summary:
    "Two automation-ready data sources plus twelve documented automations and six button chains, each with the exact trigger, condition and action.",
  databases: [
    {
      ref: "tasks",
      title: "Tasks",
      icon: "✅",
      properties: {
        Name: title(),
        Status: status([
          { name: "Inbox", color: "gray", group: "To-do" },
          { name: "Today", color: "blue", group: "To-do" },
          { name: "Doing", color: "yellow", group: "In progress" },
          { name: "Waiting", color: "orange", group: "In progress" },
          { name: "Done", color: "green", group: "Complete" },
        ]),
        Owner: person(),
        Due: date(),
        Priority: sel([
          { name: "P1", color: "red" },
          { name: "P2", color: "yellow" },
          { name: "P3", color: "gray" },
        ]),
        Tags: multi([
          { name: "deep", color: "purple" },
          { name: "admin", color: "gray" },
          { name: "client", color: "blue" },
          { name: "personal", color: "green" },
        ]),
        "Escalated": chk(),
        "Snoozed until": date(),
        "Started at": date(),
        "Finished at": date(),
        Created: createdTime(),
        "Cycle time (hours)": formula(
          'if(and(not(empty(prop("Started at"))), not(empty(prop("Finished at")))), dateBetween(prop("Finished at"), prop("Started at"), "hours"), 0)'
        ),
        "Is overdue": formula(
          'if(and(not(empty(prop("Due"))), prop("Due") < now(), prop("Status") != "Done"), true, false)'
        ),
        "Days waiting": formula(
          'if(prop("Status") == "Waiting", dateBetween(now(), prop("Last edited"), "days"), 0)'
        ),
        "Last edited": { last_edited_time: {} },
      },
      seed: [
        { name: "Write the registry spec", props: { Status: "Doing", Priority: "P1", Tags: ["deep"] } },
        { name: "Chase the invoice", props: { Status: "Waiting", Priority: "P2", Tags: ["admin"] } },
        { name: "Book flights", props: { Status: "Inbox", Priority: "P3", Tags: ["personal"] } },
      ],
    },
    {
      ref: "inbox",
      title: "Inbox",
      icon: "📥",
      properties: {
        Name: title(),
        Source: sel([
          { name: "Email", color: "blue" },
          { name: "Slack", color: "purple" },
          { name: "Form", color: "green" },
          { name: "Manual", color: "gray" },
        ]),
        Captured: createdTime(),
        Triaged: chk(),
        Body: text(),
        Link: url(),
        "Turned into": relation("tasks", { twoWay: true, syncedName: "From inbox" }),
      },
      seed: [{ name: "Client asked about the timeline", props: { Source: "Email" } }],
    },
  ],
  views: [
    { on: "tasks", name: "Board", type: "board", configuration: { type: "board", card_layout: "comfortable" } },
    {
      on: "tasks",
      name: "Today",
      type: "list",
      filter: filterProperty("Status", "status", { equals: "Today" }),
    },
    {
      on: "tasks",
      name: "Overdue",
      type: "table",
      filter: filterProperty("Is overdue", "checkbox", { equals: true }),
      sorts: [{ property: "Due", direction: "ascending" }],
    },
    {
      on: "tasks",
      name: "Waiting too long",
      type: "table",
      filter: filterProperty("Days waiting", "number", { greater_than: 3 }),
    },
    {
      on: "tasks",
      name: "Completed per week",
      type: "chart",
      configuration: {
        type: "chart",
        chart_type: "line",
        x_axis: { type: "date", property_name: "Finished at", date_grouping: "week" },
        y_axis: { aggregator: "count" },
        color_theme: "green",
        height: "medium",
      },
      filter: filterProperty("Status", "status", { equals: "Done" }),
    },
    { on: "inbox", name: "Untriaged", type: "table", filter: filterProperty("Triaged", "checkbox", { equals: false }) },
  ],
  pages: [
    {
      title: "Automation playbook",
      icon: "⚡",
      blocks: [
        callout(
          [
            t("Buttons and database automations cannot be created through the Notion API. ", { bold: true }),
            t(
              "This recipe installs the two data sources they act on, then gives you the exact click-path for each one. Twelve automations, six buttons, three recurring templates. Roughly an afternoon, and then they run forever."
            ),
          ],
          "⚡",
          "red_background"
        ),
        tableOfContents(),
        heading(2, "Automations on Tasks"),
        heading(3, "1. Start the clock"),
        bullet([t("Trigger: ", { bold: true }), t("Status changes to Doing")]),
        bullet([t("Action: ", { bold: true }), t("Edit page → Started at = Today (with time)")]),
        bullet([t("Why: ", { bold: true }), t("Cycle time is unmeasurable without a start stamp, and nobody adds one by hand.")]),
        heading(3, "2. Stop the clock"),
        bullet([t("Trigger: ", { bold: true }), t("Status changes to Done")]),
        bullet([t("Action: ", { bold: true }), t("Finished at = Today; add confetti")]),
        heading(3, "3. Escalate P1s"),
        bullet([t("Trigger: ", { bold: true }), t("Priority changes to P1")]),
        bullet([t("Action: ", { bold: true }), t("Set Due = Today, Escalated = checked, Slack message to #ops")]),
        heading(3, "4. Flag overdue, daily"),
        bullet([t("Trigger: ", { bold: true }), t("Due is before Today")]),
        bullet([t("Condition: ", { bold: true }), t("Status is not Done")]),
        bullet([t("Action: ", { bold: true }), t("Comment @Owner “Overdue: reschedule or finish”")]),
        heading(3, "5. Un-snooze"),
        bullet([t("Trigger: ", { bold: true }), t("Snoozed until is Today")]),
        bullet([t("Action: ", { bold: true }), t("Status = Today, clear Snoozed until")]),
        heading(3, "6. Chase what is Waiting"),
        bullet([t("Trigger: ", { bold: true }), t("Status changes to Waiting")]),
        bullet([t("Action: ", { bold: true }), t("Set a reminder 3 days out")]),
        heading(2, "Automations on Inbox"),
        heading(3, "7. Auto-triage flag"),
        bullet([t("Trigger: ", { bold: true }), t("Page created")]),
        bullet([t("Action: ", { bold: true }), t("Comment “Triage within 24h or it becomes a task”")]),
        heading(3, "8. Promote to task"),
        bullet([t("Trigger: ", { bold: true }), t("Triaged is checked")]),
        bullet([t("Action: ", { bold: true }), t("Add page to Tasks, Status = Inbox, Name = this page's name, From inbox = this page")]),
        heading(2, "Buttons"),
        simpleTable([
          ["Button", "Where", "Actions in order"],
          ["Start day", "Home page", "Open Today view · add a blank Inbox row · show today's date"],
          ["End day", "Home page", "Move every Doing task to Today · add a “What did you finish?” Inbox row"],
          ["Weekly reset", "Home page", "Move Done tasks to Archive · clear Snoozed until on all tasks"],
          ["Escalate", "Tasks", "Priority = P1 · Due = Today · Slack #ops"],
          ["Snooze 3 days", "Tasks", "Snoozed until = +3 days · Status = Inbox"],
          ["Mark done", "Tasks", "Status = Done · Finished at = Today · confetti"],
        ]),
        heading(2, "Recurring templates"),
        bullet([t("Daily standup: ", { bold: true }), t("every weekday 08:45. Body: linked Today view, linked Overdue view, one prompt per person.")]),
        bullet([t("Weekly review: ", { bold: true }), t("every Friday 16:30. Body: Completed per week chart, Waiting too long table, three questions.")]),
        bullet([t("Monthly retro: ", { bold: true }), t("last working day, 17:00. Body: cycle-time averages, what to stop doing.")]),
        divider(),
        heading(2, "What Notion still cannot do"),
        callout(
          [
            t("Native automations only fire inside one database. ", { bold: true }),
            t(
              "Cross-database writes need a second automation on the target, or an external tool. Formulas cannot trigger side effects: they can only display a value, so a formula that says “overdue” needs an automation watching the same condition to actually notify anyone. If you find yourself chaining five automations to approximate one conditional branch, you have outgrown native and should use Make, n8n or the API."
            ),
          ],
          "🚧",
          "yellow_background"
        ),
      ],
    },
  ],
  manual: [
    {
      title: "All eight automations above",
      reason: AUTOMATION_LIMITATION,
      steps: [
        "Open Tasks → ••• → Automations → New automation, and work down the list on the playbook page.",
        "Each entry gives the trigger, the condition and the action in the order the panel asks for them.",
        "Date-based triggers are evaluated once a day, not continuously: a task due at 09:00 may not fire until the daily pass.",
        "Automations are per-database and do not copy when you duplicate the database.",
      ],
    },
    {
      title: "All six buttons",
      reason: BUTTON_LIMITATION,
      steps: [
        "On the target page, type /button.",
        "Add each action in the order given in the table; Notion runs them top to bottom.",
        "For “add page to” actions you can pre-fill properties from the current page.",
        "Buttons cannot loop, cannot branch, and cannot read a rollup. If a step needs any of those, it is an automation or an API call.",
      ],
    },
    {
      title: "Three recurring templates",
      reason: RECURRING_LIMITATION,
      steps: [
        "Create a “Rituals” database with Date, Type (select) and Owner (person).",
        "Add one template per ritual with the body described above, including the linked views and charts.",
        "On each template: ••• → Repeat → pick the schedule.",
        "Recurring templates create pages only; they cannot pre-fill relations or run automations.",
      ],
    },
  ],
};
