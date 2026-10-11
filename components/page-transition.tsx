import type { ReactNode } from "react";
import { ViewTransition } from "react";

/**
 * Page-level view transition.
 *
 * Placed in each page component, never in a layout : layouts persist across
 * navigations, so their enter/exit would only ever fire on first mount and the
 * route change would animate nothing.
 *
 * Two behaviours, because they mean two different things:
 *
 * • `nav-forward` / `nav-back` : a horizontal slide, for hierarchical
 *     movement (catalog → component, component → catalog). It communicates
 *     depth, so it is reserved for exactly that.
 * • `default` : a quiet crossfade for lateral navigation between top-level
 *     sections. Sliding those would falsely imply a spatial relationship
 *     between, say, Pricing and Docs that does not exist.
 *
 * `default="none"` on the component keeps it from firing on untyped updates
 * such as revalidation. Browsers without the View Transition API, and anyone
 * with prefers-reduced-motion, skip all of it : see globals.css.
 */
const ENTER = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "fade-in",
};

const EXIT = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "fade-out",
};

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={ENTER} exit={EXIT} default="none">
      {children}
    </ViewTransition>
  );
}

/**
 * Shared element for a component's preview: the same `name` on the catalog
 * card and on the detail page makes the preview morph, which is the clearest
 * possible signal that you are looking at the same thing, gone deeper.
 *
 * `default="none"` matters here : without it, every filter or sort update in
 * the catalog would crossfade all 71 cards at once.
 */
export function ComponentPreviewTransition({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  return (
    <ViewTransition name={`component-${slug}`} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
