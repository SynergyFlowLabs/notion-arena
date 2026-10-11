import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Notion's buttons are rectangular-sober: 8px radius, never pills, flat colour
 * with no drop shadow, and exactly one saturated fill (Signal Blue). Transitions
 * name their properties — `transition: all` is banned by the interface
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
        /** Notion's dark app-ink button — for surfaces that are already blue. */
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
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as a child element (usually next/link) instead of a <button>. */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }));

    // asChild: the child is a link, so adopt its element and keep our styling.
    // Implemented without an extra dependency by cloning the single child.
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        className: cn(classes, (children as React.ReactElement<{ className?: string }>).props.className),
        ref,
      });
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
