/**
 * AIAIAC Motion System
 * Centralized motion tokens, easing curves, timing constants, and reduced-motion utilities.
 */

/** Signature AIAIAC cubic-bezier easing for smooth editorial UI reveals */
export const EASE_EMERALD = [0.16, 1, 0.3, 1] as const;

/** Quick response curve for interactive hover/focus micro-interactions */
export const EASE_OUT_FAST = [0.22, 1, 0.36, 1] as const;

/** Standard durations in seconds */
export const DURATION_FAST = 0.3;
export const DURATION_DEFAULT = 0.45;
export const DURATION_ENTRANCE = 0.85;

/** Spring transition defaults */
export const SPRING_GENTLE = {
  type: "spring",
  stiffness: 180,
  damping: 24,
  mass: 0.8,
} as const;

/** Reusable Framer Motion variant for replayable section reveals */
export const sectionRevealVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION_ENTRANCE,
      ease: EASE_EMERALD,
    },
  },
};

/** Reusable Framer Motion stagger container variant */
export const containerStaggerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};
