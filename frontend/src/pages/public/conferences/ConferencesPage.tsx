import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { createBreadcrumbSchema } from "@/components/common/SEO";
import { AbstractSubmissionSection } from "./AbstractSubmissionSection";
import { ConferencesCtaSection } from "./ConferencesCtaSection";
import { HeroSection } from "./HeroSection";
import { PreviousConferenceSection } from "./PreviousConferenceSection";
import { ProgrammeFormatsSection } from "./ProgrammeFormatsSection";
import { TechnicalConferencesSection } from "./TechnicalConferencesSection";
import { TechnicalTopicsSection } from "./TechnicalTopicsSection";

export function ConferencesPage() {
  return (
    <PublicPageLayout
      title="Conferences | AIAIAC Africa 2027"
      description="Explore the technical conference programme for AIAIAC Africa 2027, bringing together four core disciplines across asset integrity, artificial intelligence, automation and cybersecurity in Lagos, Nigeria."
      canonical="/conferences"
      schema={createBreadcrumbSchema([
        { name: "Home", item: "/" },
        { name: "Conferences", item: "/conferences" },
      ])}
    >
      {/* 1. Immersive Hero (#05190F) */}
      <HeroSection />

      {/* 2. Four Technical Conferences: Overview + 4 Substantial Editorial Blocks (#F5F2E9, #FFFFFF, #E5EBE5, #FAF8F2) */}
      <TechnicalConferencesSection />

      {/* 3. Technical Topics: 4 Grouped Editorial Columns (#FFFFFF) */}
      <TechnicalTopicsSection />

      {/* 4. Programme Formats: Asymmetric Editorial Layout (#F5F2E9) */}
      <ProgrammeFormatsSection />

      {/* 5. Submit an Abstract: Call for Papers & Key Guidelines (#071C13) */}
      <AbstractSubmissionSection />

      {/* 6. Previous Conference: Restrained Video & Factual Review (#E8EEE8) */}
      <PreviousConferenceSection />

      {/* 7. Final Participation CTA (#05190F) */}
      <ConferencesCtaSection />
    </PublicPageLayout>
  );
}
