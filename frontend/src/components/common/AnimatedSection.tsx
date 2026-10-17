import type { ReactNode } from "react";
import { Reveal } from "@/components/common/Reveal";

export function AnimatedSection({
  children,
  className,
  delay = 0,
  as = "div",
  once = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "span";
  once?: boolean;
}) {
  return (
    <Reveal className={className} delay={delay} as={as} once={once}>
      {children}
    </Reveal>
  );
}
