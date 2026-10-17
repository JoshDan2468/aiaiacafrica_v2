import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DynamicHeroBackgroundProps {
  mode?: "video" | "ambient" | undefined;
  videoSrc?: string | undefined;
  poster?: string | undefined;
  className?: string | undefined;
}

export function DynamicHeroBackground({
  mode = "ambient",
  videoSrc = "/assets/aiaiac-2027/videos/aiaiac-hero.mp4",
  poster,
  className,
}: DynamicHeroBackgroundProps) {
  if (mode === "video") {
    return (
      <div className={cn("absolute inset-0 -z-10 overflow-hidden pointer-events-none", className)}>
        <video
          autoPlay
          loop
          muted
          playsInline
          poster={poster}
          className="h-full w-full object-cover opacity-35"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-[#071C13] via-[#071C13]/85 to-[#071C13]/70" />
      </div>
    );
  }

  // Ambient Brand Motion Mode: subtle, slow 24s CSS radial gradient shifts across #05190F, #0B2A1D, #173D2D
  return (
    <div
      className={cn(
        "ambient-brand-bg pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#071C13]/40 to-[#071C13]" />
    </div>
  );
}

export interface DynamicPageHeroProps {
  mode?: "video" | "ambient" | undefined;
  videoSrc?: string | undefined;
  poster?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}

export function DynamicPageHero({
  mode = "ambient",
  videoSrc,
  poster,
  className,
  children,
}: DynamicPageHeroProps) {
  return (
    <header
      className={cn(
        "relative w-full overflow-hidden bg-[#05190F] pb-16 pt-32 text-[#F7F5EF] sm:pb-20 sm:pt-36 lg:pb-24 lg:pt-44",
        className,
      )}
    >
      <DynamicHeroBackground mode={mode} videoSrc={videoSrc} poster={poster} />
      {children}
    </header>
  );
}
