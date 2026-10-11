import type { ReactNode } from "react";
import { DocsNav } from "@/components/docs-nav";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-10 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <div className="lg:sticky lg:top-20">
            <DocsNav />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
