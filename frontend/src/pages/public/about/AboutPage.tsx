import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { createBreadcrumbSchema } from "@/components/common/SEO";
import { ConferenceCoversSection } from "./ConferenceCoversSection";
import { HeroSection } from "./HeroSection";
import { JoinCtaSection } from "./JoinCtaSection";
import { WhatToExpectSection } from "./WhatToExpectSection";
import { WhoAttendsSection } from "./WhoAttendsSection";
import { WhySection } from "./WhySection";

export function AboutPage() {
  return (
    <PublicPageLayout
      title="About AIAIAC Africa 2027 | Asset Integrity, AI, Automation & Cybersecurity"
      description="Learn about the mission, technical disciplines, conference experience, and industry leadership driving AIAIAC Africa 2027 in Lagos, Nigeria, 22–23 June 2027."
      canonical="/about"
      schema={createBreadcrumbSchema([
        { name: "Home", item: "/" },
        { name: "About", item: "/about" },
      ])}
    >
      {/* 1. Hero: Dark (#05190F) */}
      <HeroSection />

      {/* 2. Conference Coverage & Large Image Break: Warm Ivory (#F6F3EB) */}
      <ConferenceCoversSection />

      {/* 3. Why AIAIAC Africa 2027: Clean White (#FFFFFF) */}
      <WhySection />

      {/* 4. What to Expect: Soft Sage (#E8EEE8) */}
      <WhatToExpectSection />

      {/* 5. Who Attends & Conference Gathering Photo: Dark Green (#071C13) */}
      <WhoAttendsSection />

      {/* 6. Final Participation CTA: Deep Dark Green (#05190F) */}
      <JoinCtaSection />
    </PublicPageLayout>
  );
}
