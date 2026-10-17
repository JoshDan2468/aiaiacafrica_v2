import { useEffect, useRef, useState } from "react";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { homepageStatistics, type HomePageStatistic } from "@/data/homepage";
import { useReducedMotion } from "@/hooks/useReducedMotion";

function useCountUp(target: number | null, reducedMotion: boolean) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState<number | null>(target);

  useEffect(() => {
    if (target === null) {
      setValue(null);
      return;
    }

    if (reducedMotion) {
      setValue(target);
      return;
    }

    const element = elementRef.current;
    if (!element) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;

        if (entry.isIntersecting) {
          const startedAt = performance.now();
          const duration = 1100;
          const tick = (now: number) => {
            const progress = Math.min((now - startedAt) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(target * eased));
            if (progress < 1) {
              frame = requestAnimationFrame(tick);
            }
          };
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(tick);
        } else {
          cancelAnimationFrame(frame);
          setValue(0);
        }
      },
      { threshold: 0.25 },
    );

    setValue(0);
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [reducedMotion, target]);

  return { elementRef, value };
}

function Statistic({ item }: { item: HomePageStatistic }) {
  const reducedMotion = useReducedMotion();
  const { elementRef, value } = useCountUp(item.value, reducedMotion);
  const display = value === null ? "TBC" : `${value.toLocaleString()}${item.suffix ?? ""}`;

  return (
    <div ref={elementRef} className="min-w-0 py-7 first:pt-0 sm:px-7 sm:py-0 sm:first:pl-0">
      <p className="numeral text-[clamp(3rem,6.5vw,6.5rem)] leading-none text-lime">{display}</p>
      <h3 className="mt-4 text-base font-bold uppercase tracking-[-0.02em] text-bone sm:text-lg">
        {item.label}
      </h3>
      <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.13em] text-white/45">
        {item.status}
      </p>
    </div>
  );
}

export function EventStatisticsSection() {
  return (
    <section
      aria-labelledby="event-statistics-title"
      className="bg-[#06150e] py-20 text-white sm:py-24 lg:py-28"
    >
      <div className="shell">
        <AnimatedSection className="flex flex-col justify-between gap-5 border-b border-white/14 pb-7 sm:flex-row sm:items-end">
          <div>
            <h2
              id="event-statistics-title"
              className="font-display text-4xl font-extrabold tracking-tight text-bone sm:text-5xl"
            >
              The figures will follow
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-white/58">
            Final attendance and programme figures will be published after organiser confirmation.
          </p>
        </AnimatedSection>
        <div className="mt-9 grid divide-y divide-white/14 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {homepageStatistics.map((item) => (
            <Statistic key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
