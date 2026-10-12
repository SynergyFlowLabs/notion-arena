/**
 * A curated list of common IANA timezones for the configurator combobox.
 * Not exhaustive (there are ~600 zones), but chosen to cover the cities /
 * offsets remote teams actually pick. The empty string ("viewer's local time")
 * is always inserted first by the combobox caller.
 *
 * Offsets are approximate DST-aware rough stamps for the hint line; they are
 * not used for computation — the widget resolves the real offset in-browser.
 */
export interface TzEntry {
  value: string;
  label: string;
  hint: string; // short offset + city/region
}

export const COMMON_TIMEZONES: TzEntry[] = [
  { value: "Pacific/Honolulu",      label: "Honolulu",               hint: "UTC−10 · Hawaii" },
  { value: "America/Anchorage",     label: "Anchorage",              hint: "UTC−9 / −8 · Alaska" },
  { value: "America/Los_Angeles",   label: "Los Angeles / Seattle",  hint: "UTC−8 / −7 · Pacific" },
  { value: "America/Denver",        label: "Denver / Phoenix",       hint: "UTC−7 / −6 · Mountain" },
  { value: "America/Chicago",       label: "Chicago / Austin",       hint: "UTC−6 / −5 · Central" },
  { value: "America/New_York",      label: "New York / Toronto",     hint: "UTC−5 / −4 · Eastern" },
  { value: "America/Halifax",       label: "Halifax",                hint: "UTC−4 / −3 · Atlantic" },
  { value: "America/Sao_Paulo",     label: "São Paulo",              hint: "UTC−3 · Brazil" },
  { value: "Atlantic/Reykjavik",    label: "Reykjavík",              hint: "UTC±0 · Iceland" },
  { value: "Europe/London",         label: "London / Dublin",        hint: "UTC+0 / +1 · UK & Ireland" },
  { value: "Europe/Lisbon",         label: "Lisbon",                 hint: "UTC+0 / +1 · Portugal" },
  { value: "Europe/Paris",          label: "Paris / Berlin",         hint: "UTC+1 / +2 · Central Europe" },
  { value: "Europe/Amsterdam",      label: "Amsterdam / Brussels",   hint: "UTC+1 / +2 · Western Europe" },
  { value: "Europe/Stockholm",      label: "Stockholm / Copenhagen", hint: "UTC+1 / +2 · Nordic" },
  { value: "Europe/Warsaw",         label: "Warsaw / Prague",        hint: "UTC+1 / +2 · Central-Eastern" },
  { value: "Europe/Athens",         label: "Athens / Helsinki",      hint: "UTC+2 / +3 · Eastern Europe" },
  { value: "Africa/Cairo",          label: "Cairo",                  hint: "UTC+2 · Egypt" },
  { value: "Africa/Johannesburg",   label: "Johannesburg",           hint: "UTC+2 · South Africa" },
  { value: "Europe/Moscow",         label: "Moscow / Istanbul",      hint: "UTC+3 · Russia / Turkey" },
  { value: "Asia/Dubai",            label: "Dubai / Abu Dhabi",      hint: "UTC+4 · Gulf" },
  { value: "Asia/Karachi",          label: "Karachi / Islamabad",    hint: "UTC+5 · Pakistan" },
  { value: "Asia/Kolkata",          label: "Mumbai / Bangalore",     hint: "UTC+5:30 · India" },
  { value: "Asia/Kathmandu",        label: "Kathmandu",              hint: "UTC+5:45 · Nepal" },
  { value: "Asia/Dhaka",            label: "Dhaka",                  hint: "UTC+6 · Bangladesh" },
  { value: "Asia/Bangkok",          label: "Bangkok / Jakarta",      hint: "UTC+7 · SE Asia" },
  { value: "Asia/Singapore",        label: "Singapore / Kuala Lumpur", hint: "UTC+8 · Singapore / MY" },
  { value: "Asia/Shanghai",         label: "Shanghai / Beijing",     hint: "UTC+8 · China" },
  { value: "Asia/Hong_Kong",        label: "Hong Kong / Taipei",     hint: "UTC+8 · HK / Taiwan" },
  { value: "Asia/Seoul",            label: "Seoul",                  hint: "UTC+9 · Korea" },
  { value: "Asia/Tokyo",            label: "Tokyo",                  hint: "UTC+9 · Japan" },
  { value: "Australia/Brisbane",    label: "Brisbane",               hint: "UTC+10 · Queensland" },
  { value: "Australia/Sydney",      label: "Sydney / Melbourne",     hint: "UTC+10 / +11 · NSW / Vic" },
  { value: "Pacific/Auckland",      label: "Auckland",               hint: "UTC+12 / +13 · NZ" },
];

/** Search IANA names and labels. */
export function searchTimezones(q: string): TzEntry[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return COMMON_TIMEZONES;
  return COMMON_TIMEZONES.filter((t) => {
    return (
      t.label.toLowerCase().includes(needle) ||
      t.hint.toLowerCase().includes(needle) ||
      t.value.toLowerCase().includes(needle) ||
      t.value.split("/").pop()?.replace(/_/g, " ").toLowerCase().includes(needle)
    );
  });
}
