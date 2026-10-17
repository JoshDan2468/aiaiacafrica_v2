import { PageHero } from "@/components/layout/PageHero";
import { activeEventNotice } from "@/data/event";
import type { RegistrationOption } from "@/types";

export function HeroSection({ option }: { option: RegistrationOption }) {
  return (
    <PageHero
      eyebrow="Registration route"
      title={option.title}
      description={option.description}
      status={activeEventNotice}
      variant="compact"
    />
  );
}
