"use client";

import * as React from "react";

/**
 * Renders `children` only once the element has entered the viewport.
 * Used so a grid of 17 live widget iframes does not all mount at once.
 */
export function InView<T extends HTMLElement>({
  children,
  fallback,
  className,
  rootMargin = "200px",
  once = true,
  as,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  rootMargin?: string;
  once?: boolean;
  as?: React.ElementType;
}) {
  const ref = React.useRef<T | null>(null);
  const [visible, setVisible] = React.useState(false);
  const Tag = (as ?? "div") as React.ElementType;

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) io.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { rootMargin }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [rootMargin, once]);

  return (
    <Tag ref={ref} className={className}>
      {visible ? children : fallback}
    </Tag>
  );
}
