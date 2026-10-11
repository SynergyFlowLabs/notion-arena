import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms covering use of Blocksmith components, embed URLs, downloadable HTML and the install API.",
};

export default function TermsPage() {
  return (
    <PageTransition>
    <article className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-h2 text-foreground">Terms of service</h1>
        <p className="mt-2 font-mono text-[12px] text-muted-foreground">Last updated 11 October 2026</p>
        <p className="mt-4 text-[14.5px] leading-[1.75] text-muted-foreground">
          Plain terms, because the product is small and so is the surface area for
          disagreement. If something here is unclear, that is our failure to write
          it well — ask and we will rewrite it.
        </p>
      </header>

      <Section n="1" title="What this service is">
        <p>
          Blocksmith publishes components for Notion workspaces in three forms: a
          hosted URL that Notion can embed, a downloadable HTML file you upload to
          Notion as an HTML block, and a set of API calls that create databases,
          views and pages inside your workspace.
        </p>
        <p>
          Blocksmith is an independent project. It is not made by, endorsed by, or
          affiliated with Notion Labs Inc. “Notion” and the Notion API are
          trademarks of Notion Labs Inc. and are used here to describe
          compatibility.
        </p>
      </Section>

      <Section n="2" title="Your Notion credentials">
        <p>
          The install API accepts a Notion integration token so it can write to
          your workspace on your behalf. That token is used for the requests you
          asked for and is not stored, logged or reused after the request
          completes.
        </p>
        <p>
          You are responsible for the scopes you grant your integration and for
          which pages you connect it to. Use an internal integration scoped as
          narrowly as the task allows. We will never ask for a token to show you a
          plan — <code>mode: "plan"</code> requires no credentials at all, and you
          should be suspicious of any tool that claims otherwise.
        </p>
      </Section>

      <Section n="3" title="What we guarantee, and what we do not">
        <p>
          Downloadable HTML files are self-contained: no external requests, no
          dependencies, no licence check at runtime. Once you have the file it
          works, and it keeps working whether or not this site exists.
        </p>
        <p>
          Hosted embed URLs are provided as-is with no uptime commitment. If we
          stop serving them, blocks using them will render blank. This is a real
          downside of hosted delivery and the reason every widget is downloadable.
          For anything you are selling, archiving or depending on, download the
          file.
        </p>
        <p>
          Notion can change its API, its block types or its sandbox behaviour at
          any time. We track those changes and update components, but we cannot
          warrant that a given component will keep behaving identically across
          Notion versions.
        </p>
      </Section>

      <Section n="4" title="What you can do with components">
        <p>
          Free components: use them anywhere, including in workspaces and templates
          you charge for. No attribution required, no licence key, no callback.
        </p>
        <p>
          Pro components: the same rights while your subscription is active. Files
          you downloaded during an active subscription keep working afterwards —
          we do not disable anything retroactively.
        </p>
        <p>
          You may modify any component you have a copy of. You may not present a
          modified component as an official Blocksmith release, and you may not
          resell the catalog itself as a competing component library.
        </p>
      </Section>

      <Section n="5" title="State and data">
        <p>
          Widgets that remember anything do so in your browser's{" "}
          <code>localStorage</code>, scoped to the sandbox the block runs in. That
          data never reaches our servers and is not synced between your devices or
          your teammates. Clearing site data removes it.
        </p>
        <p>
          Because a sandboxed HTML block has no network access, no widget can send
          your Notion data anywhere — not to us and not to anyone else. This is a
          property of Notion's sandbox rather than a promise we make, but it holds.
        </p>
      </Section>

      <Section n="6" title="Payments">
        <p>
          Pro is free during the beta and no payment details are collected. When
          billing starts, anyone using Pro during the beta will be told before any
          charge is made, and will keep access for the notice period regardless.
        </p>
        <p>
          Subscriptions renew monthly and can be cancelled at any time; access
          continues to the end of the paid period.
        </p>
      </Section>

      <Section n="7" title="Acceptable use">
        <p>
          Do not use the install API to write to workspaces you do not control, do
          not use embed URLs to serve content that violates Notion's own terms, and
          do not attempt to route around Notion's rate limits using this service as
          a proxy. Abuse of the install endpoint gets the caller blocked, not the
          component removed.
        </p>
      </Section>

      <Section n="8" title="Liability">
        <p>
          The service is provided without warranty of any kind, to the maximum
          extent permitted by law. Our total liability for any claim arising from
          your use of Blocksmith is limited to the amount you paid us in the twelve
          months before the claim — which, during the beta, is nothing.
        </p>
        <p>
          In particular: an install that creates databases in the wrong place, a
          recipe that overwrites an existing property, or a formula that computes
          something you did not intend are outcomes we help you avoid by publishing
          the plan first, but they remain your workspace and your decision to run.
        </p>
      </Section>

      <Section n="9" title="Changes">
        <p>
          If these terms change materially, the date at the top changes and the
          previous version stays reachable. Continued use after a change is
          acceptance of it.
        </p>
      </Section>

      <footer className="rounded-xl border border-border bg-raised p-4 text-[13.5px] leading-relaxed text-muted-foreground">
        Questions about these terms, or about whether a specific use is covered:
        open an issue on{" "}
        <Link href="https://github.com/SynergyFlowLabs/notion-components">
          the repository
        </Link>
        . Public questions get public answers, which is better for everyone than a
        private inbox.
      </footer>
    </article>
  
    </PageTransition>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="flex items-baseline gap-2.5 text-h5 text-foreground">
        <span className="font-mono text-[12.5px] font-normal text-muted-foreground">{n}</span>
        {title}
      </h2>
      <div className="mt-2.5 flex flex-col gap-3 [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-foreground [&_p]:max-w-2xl [&_p]:text-pretty [&_p]:text-[14.5px] [&_p]:leading-[1.75] [&_p]:text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
