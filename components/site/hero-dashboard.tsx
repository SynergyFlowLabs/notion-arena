import Image from "next/image";

/**
 * Hero visual: a single Notion-style editorial illustration on the right.
 *
 * The PNG is black ink on a transparent background, so it renders directly
 * onto the page canvas in any theme. `unoptimized` prevents Next's image
 * pipeline from re-encoding to a format that loses alpha (which recreates
 * the cream box). In dark mode we invert the ink from black to white.
 *
 * The wrapper uses `max-h-[560px]` with intrinsic aspect ratio so the art
 * scales to fit but never stretches to fill the column.
 */
export function HeroDashboard() {
  return (
    <div
      className="relative flex w-full items-center justify-center"
      aria-hidden="true"
    >
      <Image
        src="/assets/hero/hero-illustration.png"
        alt=""
        width={1376}
        height={768}
        priority
        unoptimized
        sizes="(max-width: 767px) 90vw, 50vw"
        className="h-auto w-full max-w-full select-none object-contain dark:invert dark:hue-rotate-180"
        style={{ maxHeight: "560px" }}
      />
    </div>
  );
}
