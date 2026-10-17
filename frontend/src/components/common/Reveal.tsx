import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { EASE_EMERALD } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export const revealUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE_EMERALD } },
};

export const revealStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  once = false,
}: {
  children: ReactNode;
  className?: string | undefined;
  delay?: number;
  as?: "div" | "section" | "li" | "span";
  once?: boolean;
}) {
  const Comp = motion[as];
  const reduced = useReducedMotion();
  return (
    <Comp
      className={className}
      initial={reduced ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-8% 0px", amount: 0.12 }}
      transition={reduced ? { duration: 0 } : { duration: 0.8, ease: EASE_EMERALD, delay }}
    >
      {children}
    </Comp>
  );
}

/** Word-by-word headline reveal with replay support. */
export function RevealText({
  text,
  className,
  delay = 0,
  once = false,
}: {
  text: string;
  className?: string | undefined;
  delay?: number;
  once?: boolean;
}) {
  const words = text.split(" ");
  const reduced = useReducedMotion();
  return (
    <motion.span
      className={cn("inline-block", className)}
      initial={reduced ? false : "hidden"}
      whileInView="show"
      viewport={{ once, margin: "-8% 0px", amount: 0.12 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.055, delayChildren: delay } },
      }}
    >
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block align-bottom">
          <motion.span
            className="inline-block"
            variants={{
              hidden: { opacity: 0, y: "0.35em" },
              show: { opacity: 1, y: "0%", transition: { duration: 0.8, ease: EASE_EMERALD } },
            }}
          >
            {w}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
