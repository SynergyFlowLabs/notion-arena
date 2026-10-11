import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Notion's buttons are rectangular-sober: 8px radius, never pills, flat colour
 * with no drop shadow, and exactly one saturated fill (Signal Blue). Transitions
 * name their properties : `transition: all` is banned by the interface
 * guidelines and costs compositor work here.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[14px] font-medium transition-[background-color,border-color,color,opacity] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** The one filled CTA. Signal Blue, white label. */
        default:
          "bg-primary text-primary-foreground hover:bg-primary-deep active:bg-primary-deep",
        /** Alias kept for call sites that mean "the blue one" explicitly. */
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-deep active:bg-primary-deep",
 /** Notion's dark app-ink button : for surfaces that are already blue. */
        notion:
          "bg-app-ink text-white hover:bg-app-ink/88 dark:bg-white dark:text-[#191919] dark:hover:bg-white/88",
        outline:
          "border border-border-strong bg-card text-foreground hover:border-foreground/35 hover:bg-secondary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "text-ink-soft hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:text-primary-deep hover:underline",
        /** For use on a dark campaign band. */
        inverted:
          "border border-white/20 bg-transparent text-band-foreground hover:border-white/40 hover:bg-white/10",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 rounded-[6px] px-3 text-[13px]",
        lg: "h-11 px-5 text-[15px] font-semibold",
        icon: "size-9",
        iconSm: "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  /**
   * Render as the child element (usually next/link) instead of a <button>,
   * keeping this component's styling. A boolean, but it is the shadcn/Radix
   * convention this library deliberately mirrors, so the familiar name wins
   * over a bespoke API.
   */
  asChild?: boolean;
}

/**
 * React 19 passes `ref` as an ordinary prop, so `forwardRef` is gone : it is
 * deprecated in 19 and adds a layer for no benefit.
 */
export function Button({
  className,
  variant,
  size,
  asChild,
  children,
  ref,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, className }));

  // asChild: adopt the child's element (an <a> from next/link) and keep our
  // styling, without pulling in a Slot dependency for one code path.
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
      className: cn(classes, child.props.className),
      ref,
    });
  }

  return (
    <button ref={ref} className={classes} {...props}>
      {children}
    </button>
  );
}

export { buttonVariants };
