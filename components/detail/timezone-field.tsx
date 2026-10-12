"use client";

import * as React from "react";
import { COMMON_TIMEZONES } from "@/lib/timezones";
import { Combobox, type ComboboxOption } from "@/components/ui/form";

const LOCAL_OPT: ComboboxOption = {
  value: "",
  label: "Viewer's local time",
  hint: "auto · uses each reader's clock",
};

const OPTIONS: ComboboxOption[] = [
  LOCAL_OPT,
  ...COMMON_TIMEZONES.map<ComboboxOption>((t) => ({
    value: t.value,
    label: t.label,
    hint: t.hint,
    keywords: t.value,
  })),
];

export function TimezoneField({
  id,
  value,
  onChange,
  className,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <Combobox
      id={id}
      value={value}
      onChange={onChange}
      options={OPTIONS}
      placeholder="Pick a timezone…"
      emptyText="No timezone matches — try a city or UTC offset."
      className={className}
    />
  );
}
