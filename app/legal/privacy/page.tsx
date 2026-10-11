import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What Blocksmith collects, which is very little: no accounts for browsing, no analytics on widget pages, no storage of Notion integration tokens.",
};

export default function PrivacyPage() {
  return (
    <PageTransition>
    <article className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-h2 text-foreground">Privacy policy</h1>
        <p className="mt-2 font-mono text-[12px] text-muted-foreground">Last updated 11 October 2026</p>
        <p className="mt-4 text-[14.5px] leading-[1.75] text-muted-foreground">
          The short version: browsing this site requires no account and sets no
          tracking cookie. Widgets cannot transmit anything, because Notion's
          sandbox gives them no network. The install API uses a token you supply
          for the request you made and does not keep it.
        </p>
      </header>

      <Section n="1" title="What we collect when you browse">
        <p>
          Nothing identifying. There is no analytics script, no advertising pixel,
          no session cookie and no account requirement to view, configure or
          download any free component.
        </p>
        <p>
          Our web host records standard request logs — IP address, user agent, the
          path requested, and a timestamp — because every web server does. Those
          logs are used to diagnose errors and to understand aggregate traffic.
          They are not sold, not shared, and not used to build a profile of you.
        </p>
      </Section>

      <Section n="2" title="What a widget can see">
        <p>
          A widget rendered inside Notion runs in a sandboxed frame with no URL and
          no network access. It cannot:
        </p>
        <ul className="list-disc pl-5">
          <li>read the Notion page it is embedded in, or any database on it;</li>
          <li>send a request to us, to an analytics service, or to anyone else;</li>
          <li>load a third-party script, font, image or beacon;</li>
          <li>access cookies, or any storage outside its own origin.</li>
        </ul>
        <p>
          What it can do is store data in your browser's <code>localStorage</code>,
          under a key namespaced <code>blocksmith.&lt;component&gt;.v1</code>. That
          data stays on your device. It is not synced to teammates, not uploaded to
          us, and removed when you clear site data.
        </p>
        <p>
          Our widgets contain no external requests by construction — the authoring
          checklist requires a grep for <code>http://</code>, <code>https://</code>{" "}
          and <code>@import</code> to return zero hits before a component ships.
        </p>
      </Section>

      <Section n="3" title="Notion integration tokens">
        <p>
          If you install a native recipe through <code>POST /api/install</code>, you
          supply an integration token so we can make Notion API calls on your
          behalf. That token is:
        </p>
        <ul className="list-disc pl-5">
          <li>held in memory for the duration of the request only;</li>
          <li>never written to a database, a log or a file;</li>
          <li>never used for anything other than the requests in the plan you approved;</li>
          <li>not required at all for <code>mode: "plan"</code>, which is why plan mode exists.</li>
        </ul>
        <p>
          We recommend an internal integration scoped to the minimum pages it needs,
          and rotating the token if you ever suspect it has been exposed. You can
          revoke it at any time from your Notion workspace settings, which ends our
          access immediately and completely.
        </p>
      </Section>

      <Section n="4" title="Configuration parameters">
        <p>
          When you configure a widget on this site, the values you type go into the
          URL query string so the preview can update. That means labels and settings
          appear in the request path, and therefore in host request logs.
        </p>
        <p>
          Do not put sensitive information into widget parameters — a client name you
          would not want in a log, a private note, anything that looks like a
          credential. Parameters are meant for display text, numbers, colours and
          dates.
        </p>
      </Section>

      <Section n="5" title="Cookies">
        <p>
          One, and it is not a cookie in the tracking sense: the light/dark
          appearance preference is stored in your browser's{" "}
          <code>localStorage</code> so the site does not flash the wrong theme on
          load. There is no cookie banner because there is nothing to consent to.
        </p>
      </Section>

      <Section n="6" title="Accounts and billing">
        <p>
          There are no accounts yet. Pro is free during the beta and no payment
          details are collected. When billing starts, a payment processor will handle
          card details — we will not see or store your card number — and this policy
          will be updated before that happens, with the previous version still
          reachable.
        </p>
      </Section>

      <Section n="7" title="Third parties">
        <p>
          The Notion API, when you install a recipe. Requests go directly from our
          server to <code>api.notion.com</code> with your token, and are governed by
          Notion's own privacy terms.
        </p>
        <p>
          Our hosting and web infrastructure providers, who process request logs on
          our behalf under their standard data-processing terms.
        </p>
        <p>
          No advertising networks, no data brokers, no analytics vendors, no
          behavioural profiling, and no sale of any data — because there is
          effectively no data to sell.
        </p>
      </Section>

      <Section n="8" title="Retention">
        <p>
          Host request logs are retained for a short operational window and then
          rolled off. Tokens are not retained at all. Component files you download
          are yours and we keep no record of which ones you took.
        </p>
      </Section>

      <Section n="9" title="Your rights">
        <p>
          Because we hold almost nothing about you, there is almost nothing to
          exercise rights over. If you have an account once billing exists, you can
          request a copy of it or have it deleted, and we will do so within 30 days.
          If you believe we hold something about you that is not described here,
          tell us and we will check rather than deflect.
        </p>
      </Section>

      <Section n="10" title="Children">
        <p>
          This service is not directed at children under 13, and we do not knowingly
          collect data from anyone under 13. Widgets run inside Notion workspaces,
          which have their own age requirements.
        </p>
      </Section>

      <footer className="rounded-xl border border-border bg-raised p-4 text-[13.5px] leading-relaxed text-muted-foreground">
        Concerns about this policy belong in public, where the answer helps everyone
        else too:{" "}
        <Link href="https://github.com/SynergyFlowLabs/notion-components">
          open an issue on the repository
        </Link>
        . See also the{" "}
        <Link href="/legal/terms">terms of service</Link>, which covers what the
        components can and cannot do rather than what we collect.
      </footer>
    </article>
  
    </PageTransition>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-baseline gap-2.5 text-h5 text-foreground">
        <span className="font-mono text-[12.5px] font-normal text-muted-foreground">{n}</span>
        {title}
      </h2>
      <div className="mt-2.5 flex flex-col gap-3 [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-foreground [&_li]:text-[14.5px] [&_li]:leading-[1.75] [&_li]:text-muted-foreground [&_p]:max-w-2xl [&_p]:text-pretty [&_p]:text-[14.5px] [&_p]:leading-[1.75] [&_p]:text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
