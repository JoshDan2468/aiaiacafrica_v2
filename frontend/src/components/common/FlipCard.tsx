import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface FlipCardProps {
  value: string;
  label: string;
  className?: string;
}

export function FlipCard({ value, label, className }: FlipCardProps) {
  const reducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value !== displayValue) {
      if (reducedMotion) {
        setDisplayValue(value);
      } else {
        setIsFlipping(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setDisplayValue(value);
          setIsFlipping(false);
        }, 220);
      }
    }
  }, [value, displayValue, reducedMotion]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className={cn("flex flex-col items-center justify-center text-center", className)}>
      <div
        className={cn(
          "relative flex h-16 w-full items-center justify-center overflow-hidden rounded-xl bg-white shadow-md transition-transform duration-200 sm:h-20",
          isFlipping && "scale-y-90 opacity-90",
        )}
        aria-label={`${label}: ${displayValue}`}
      >
        {/* Single Centered Tabular Numeral */}
        <span className="font-display text-3xl font-extrabold tracking-tight text-[#05190F] tabular-nums sm:text-4xl">
          {displayValue}
        </span>

        {/* Center Split-Flap Crease Line */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 h-[1px] -translate-y-1/2 bg-black/10 shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
        />
      </div>

      <span className="mt-2 font-sans text-xs font-semibold text-white/80">{label}</span>
    </div>
  );
}
