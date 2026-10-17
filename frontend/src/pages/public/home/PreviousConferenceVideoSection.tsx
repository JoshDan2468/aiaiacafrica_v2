import { useEffect, useRef } from "react";
import { previousConferenceVideoMedia } from "@/data/media";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface NavigatorConnection {
  saveData?: boolean;
}

function isDataSavingEnabled() {
  const navigatorWithConnection = navigator as Navigator & {
    connection?: NavigatorConnection;
  };

  return navigatorWithConnection.connection?.saveData === true;
}

export function PreviousConferenceVideoSection() {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();
  const { videoSrc, captionSrc, posterSrc, posterAlt, objectPosition } =
    previousConferenceVideoMedia;

  useEffect(() => {
    const frame = frameRef.current;
    const video = videoRef.current;

    if (!frame || !video || reducedMotion || isDataSavingEnabled()) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;

        // Play muted when 35%+ in view, pause when < 20% in view
        if (entry.intersectionRatio >= 0.35 && !video.ended) {
          void video.play().catch(() => undefined);
        } else if (entry.intersectionRatio < 0.2) {
          video.pause();
        }
      },
      { threshold: [0, 0.2, 0.35, 0.6, 1] },
    );

    observer.observe(frame);

    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [reducedMotion, videoSrc]);

  return (
    <section
      aria-label="Previous AIAIAC Conference Highlights Video"
      className="relative isolate overflow-hidden bg-[#020b07] py-12 sm:py-16 lg:py-20 text-white"
    >
      <div className="shell">
        <div className="mx-auto max-w-6xl">
          <div
            ref={frameRef}
            className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/14 bg-[#05190F] shadow-2xl"
          >
            {videoSrc ? (
              <video
                ref={videoRef}
                aria-label="Previous AIAIAC conference highlights video"
                className="h-full w-full object-cover"
                style={{ objectPosition }}
                controls
                muted
                playsInline
                preload="metadata"
                poster={posterSrc}
              >
                <source src={videoSrc} type="video/mp4" />
                {captionSrc ? (
                  <track kind="captions" src={captionSrc} srcLang="en" label="English" default />
                ) : null}
                Your browser does not support embedded video.
              </video>
            ) : (
              <img
                src={posterSrc}
                alt={posterAlt}
                className="h-full w-full object-cover"
                style={{ objectPosition }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
