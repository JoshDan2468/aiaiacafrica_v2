import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface CinematicMediaProps {
  source?: string | null;
  poster: string;
  posterAlt: string;
  width: number;
  height: number;
  decorative?: boolean;
  priority?: boolean;
  objectPosition?: string;
  className?: string;
  mediaClassName?: string;
}

export function CinematicMedia({
  source,
  poster,
  posterAlt,
  width,
  height,
  decorative = false,
  priority = false,
  objectPosition = "center",
  className,
  mediaClassName,
}: CinematicMediaProps) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(priority);
  const [isInPlaybackRange, setIsInPlaybackRange] = useState(priority);
  const saveData =
    typeof navigator !== "undefined" &&
    "connection" in navigator &&
    Boolean(
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
    );
  const canUseVideo = Boolean(source) && !reducedMotion && !saveData;
  const mediaStyle: CSSProperties = { objectPosition };

  useEffect(() => {
    if (!canUseVideo) {
      setShouldLoadVideo(false);
      setIsInPlaybackRange(false);
      return;
    }

    if (priority) {
      setShouldLoadVideo(true);
      setIsInPlaybackRange(true);
      return;
    }

    const container = containerRef.current;
    if (!container || !("IntersectionObserver" in window)) {
      setShouldLoadVideo(true);
      setIsInPlaybackRange(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) setShouldLoadVideo(true);
        setIsInPlaybackRange(entry.isIntersecting && entry.intersectionRatio >= 0.15);
      },
      { rootMargin: "320px 0px", threshold: [0, 0.15] },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [canUseVideo, priority]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !canUseVideo || !shouldLoadVideo) return;

    if (priority || isInPlaybackRange) {
      void video.play().catch(() => {
        // Autoplay can be blocked by browser policy. The poster remains a complete fallback.
      });
      return;
    }

    video.pause();
  }, [canUseVideo, isInPlaybackRange, priority, shouldLoadVideo]);

  return (
    <div ref={containerRef} className={cn("cinematic-media", className)}>
      {source && canUseVideo && shouldLoadVideo ? (
        <video
          ref={videoRef}
          src={source}
          poster={poster}
          autoPlay={priority}
          muted
          loop
          playsInline
          preload={priority ? "auto" : "metadata"}
          aria-hidden={decorative || undefined}
          aria-label={decorative ? undefined : posterAlt}
          className={cn("cinematic-media__visual", mediaClassName)}
          style={mediaStyle}
        />
      ) : (
        <img
          src={poster}
          alt={decorative ? "" : posterAlt}
          aria-hidden={decorative || undefined}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className={cn("cinematic-media__visual cinematic-media__fallback", mediaClassName)}
          style={mediaStyle}
        />
      )}
    </div>
  );
}
