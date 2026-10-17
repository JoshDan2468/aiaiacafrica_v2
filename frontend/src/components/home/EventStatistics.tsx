import { useEffect, useRef, useState } from "react";
import { activeEventStats, type EventStatisticItem } from "@/data/eventStats";
import { useReducedMotion } from "@/hooks/useReducedMotion";

function CountUpItem({ item }: { item: EventStatisticItem }) {
  const reducedMotion = useReducedMotion();
  const [currentValue, setCurrentValue] = useState<number>(reducedMotion ? item.value : 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef<boolean>(false);

  useEffect(() => {
    if (reducedMotion) {
      setCurrentValue(item.value);
      return;
    }

    const node = containerRef.current;
    if (!node) return;

    let animFrame: number;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting && !hasAnimatedRef.current) {
          hasAnimatedRef.current = true;
          const startTime = performance.now();
          const duration = 1500; // 1.5s duration

          const step = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            // Ease-out cubic for realistic numeric deceleration
            const eased = 1 - Math.pow(1 - progress, 3);
            setCurrentValue(Math.round(item.value * eased));

            if (progress < 1) {
              animFrame = requestAnimationFrame(step);
            }
          };

          animFrame = requestAnimationFrame(step);
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [item.value, reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center text-center sm:items-start sm:text-left"
    >
      <div className="font-display text-4xl font-black tracking-tight text-[#FAF8F2] sm:text-5xl lg:text-6xl">
        <span>{currentValue}</span>
        {item.suffix && <span className="text-[#CFEA3B] ml-0.5">{item.suffix}</span>}
      </div>
      <p className="mt-2 text-sm font-medium tracking-wide text-[#DDE6DE]/90 sm:text-base">
        {item.label}
      </p>
    </div>
  );
}

export function EventStatistics() {
  if (!activeEventStats || activeEventStats.length === 0) return null;

  return (
    <section
      aria-label="Conference Key Statistics"
      className="relative isolate overflow-hidden bg-[#071C13] py-14 sm:py-18 lg:py-20 border-y border-[#173D2D]/60"
    >
      <div className="shell relative z-10">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 sm:gap-12 lg:gap-16 items-start justify-between">
          {activeEventStats.map((stat) => (
            <CountUpItem key={stat.id} item={stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
