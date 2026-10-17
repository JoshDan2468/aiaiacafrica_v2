import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState, type PointerEvent, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

export function MagneticCard({
  children,
  className,
  strength = 7,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const reducedMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const x = useSpring(useMotionValue(0), { stiffness: 180, damping: 22, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 180, damping: 22, mass: 0.4 });

  useEffect(() => {
    const query = window.matchMedia("(pointer: fine) and (min-width: 900px)");
    const update = () => setEnabled(query.matches && !reducedMotion);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [reducedMotion]);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!enabled) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set(((event.clientX - bounds.left) / bounds.width - 0.5) * strength);
    y.set(((event.clientY - bounds.top) / bounds.height - 0.5) * strength);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      className={cn("will-change-transform", className)}
      style={{ x, y }}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onBlur={reset}
    >
      {children}
    </motion.div>
  );
}
