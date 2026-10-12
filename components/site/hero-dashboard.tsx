"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * New Hero: Static, lightweight, SEO-friendly.
 * Uses generated images for floating component cards and a brand avatar.
 * No live iframes — instant paint, great for search and slow connections.
 */

interface FloatingWidget {
  slug: string;
  name: string;
  category: string;
  image: string;
  alt: string;
  position: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    rotate: number;
  };
  popular: boolean;
}

interface FloatingStat {
  value: string;
  label: string;
  icon: string;
  position: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    translateX?: string;
  };
}

const FLOATING_WIDGETS: FloatingWidget[] = [
  {
    slug: "pomodoro-timer",
    name: "Pomodoro Timer",
    category: "Time",
    image: "/assets/hero/widget-pomodoro.png",
    alt: "Pomodoro timer with circular progress ring at 25:00",
    position: { top: "10%", left: "5%", rotate: -3 },
    popular: true,
  },
  {
    slug: "kpi-strip",
    name: "KPI Strip",
    category: "Dashboards",
    image: "/assets/hero/widget-kpi-strip.png",
    alt: "Four metric tiles with sparklines and delta arrows",
    position: { top: "5%", right: "8%", rotate: 2 },
    popular: true,
  },
  {
    slug: "habit-grid",
    name: "Habit Grid",
    category: "Trackers",
    image: "/assets/hero/widget-habit-grid.png",
    alt: "GitHub-style habit heatmap with 5 habits and streaks",
    position: { bottom: "15%", left: "3%", rotate: 1 },
    popular: true,
  },
  {
    slug: "flip-clock",
    name: "Flip Clock",
    category: "Dashboards",
    image: "/assets/hero/widget-flip-clock.png",
    alt: "Split-flap clock showing 14:32 with timezone",
    position: { top: "20%", right: "3%", rotate: -2 },
    popular: true,
  },
  {
    slug: "goal-ring",
    name: "Goal Ring",
    category: "Dashboards",
    image: "/assets/hero/widget-goal-ring.png",
    alt: "Circular progress ring at 68% with milestones",
    position: { bottom: "10%", right: "12%", rotate: 3 },
    popular: false,
  },
  {
    slug: "countdown",
    name: "Countdown",
    category: "Time",
    image: "/assets/hero/widget-countdown.png",
    alt: "Countdown to Q4 launch with days, hours, minutes",
    position: { bottom: "5%", left: "20%", rotate: -1 },
    popular: false,
  },
];

const FLOATING_STATS: FloatingStat[] = [
  { value: "143", label: "Components", icon: "📦", position: { top: "8%", left: "50%", translateX: "-50%" } },
  { value: "132", label: "Widgets", icon: "🧩", position: { top: "45%", left: "95%", translateX: "0" } },
  { value: "11", label: "Recipes", icon: "⚙️", position: { bottom: "45%", left: "95%", translateX: "0" } },
  { value: "MIT", label: "Licensed", icon: "⚖️", position: { bottom: "8%", left: "50%", translateX: "-50%" } },
];

export function HeroDashboard() {
  return (
    <div className="relative" aria-hidden="true">
      {/* Floating widget cards — absolute positioned, layered */}
      <div className="relative h-[480px] w-full max-w-[800px] mx-auto">
        {FLOATING_WIDGETS.map((widget) => {
          return (
            <FloatingWidgetCard key={widget.slug} widget={widget} />
          );
        })}

        {/* Center brand avatar */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="relative">
            {/* Outer glow ring */}
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-500/30 via-emerald-500/30 to-blue-500/30 blur-2xl opacity-60 animate-pulse-slow" />
            
            {/* Avatar */}
            <Image
              src="/assets/hero/notion-arena-avatar.png"
              alt="Notion Arena"
              width={140}
              height={140}
              className="relative rounded-2xl shadow-2xl ring-4 ring-white/80 dark:ring-gray-900/80"
              priority
            />

            {/* Subtle orbiting dots */}
            <div className="absolute inset-0 -inset-8">
              {[0, 1, 2, 3, 4, 5].map((i) => {
                return (
                  <OrbitingDot key={i} index={i} total={6} radius={90} />
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats badges floating around avatar */}
        <FloatingStats />
      </div>

      {/* Grounding shadow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-16 bg-gradient-to-t from-gray-900/10 to-transparent rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}

function FloatingWidgetCard({ widget }: { widget: FloatingWidget }) {
  const { rotate, ...position } = widget.position;
  const style: React.CSSProperties = {
    ...position,
    transform: `rotate(${rotate}deg)`,
  };

  return (
    <div
      style={style}
      className={cn(
        "absolute transition-all duration-500 hover:scale-[1.02] hover:rotate-0",
        "cursor-pointer group"
      )}
    >
      {/* Widget image card */}
      <div className="relative rounded-xl border border-gray-200/50 dark:border-gray-800/50 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
        <Image
          src={widget.image}
          alt={widget.alt}
          width={widget.slug === "kpi-strip" ? 300 : widget.slug === "habit-grid" ? 280 : 240}
          height={widget.slug === "kpi-strip" ? 100 : widget.slug === "habit-grid" ? 170 : widget.slug === "flip-clock" ? 120 : widget.slug === "countdown" ? 90 : 180}
          className="block"
          loading="lazy"
        />

        {/* Category badge */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/95 to-white/0 dark:from-gray-900/95 dark:to-gray-900/0 px-3 py-3 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {widget.category}
            </span>
            {widget.popular && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100/90 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                ★ Popular
              </span>
            )}
          </div>
        </div>

        {/* Hover reveal: name + CTA */}
        <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 flex flex-col items-center justify-center p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h4 className="text-center font-semibold text-gray-900 dark:text-white mb-1">{widget.name}</h4>
          <span className="text-xs text-gray-500 dark:text-gray-400">Click to explore →</span>
        </div>
      </div>

      {/* Subtle label below card */}
      <div className="mt-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400 max-w-[200px]">
        {widget.name}
      </div>
    </div>
  );
}

function OrbitingDot({ index, total, radius }: { index: number; total: number; radius: number }) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  const delay = (index / total) * 4;

  return (
    <div
      className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-emerald-500 shadow-lg animate-orbit"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        animationDelay: `${delay}s`,
      }}
      aria-hidden="true"
    />
  );
}

function FloatingStats() {
  return (
    <>
      {FLOATING_STATS.map((stat) => {
        const { translateX, ...position } = stat.position;
        const transformValue = translateX ? `translateX(${translateX})` : undefined;
        return (
          <div
            key={stat.label}
            className="absolute pointer-events-none"
            style={{
              ...position,
              transform: transformValue,
            } as React.CSSProperties}
          >
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/50 shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <div className="mt-1.5">
                <div className="font-display font-bold text-2xl text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.label}</div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}