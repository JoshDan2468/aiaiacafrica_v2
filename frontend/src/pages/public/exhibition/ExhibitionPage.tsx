import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { createBreadcrumbSchema } from "@/components/common/SEO";
import { HeroSection } from "./HeroSection";
import { WhyExhibitSection } from "./WhyExhibitSection";
import { ExhibitionVisualSection } from "./ExhibitionVisualSection";
import { IndustryAreasSection } from "./IndustryAreasSection";
import { AudienceSection } from "./AudienceSection";
import { ExhibitionOptionsSection } from "./ExhibitionOptionsSection";
import { ParticipatingOrganisationsSection } from "./ParticipatingOrganisationsSection";
import { ExhibitionEnquirySection } from "./ExhibitionEnquirySection";

export function ExhibitionPage() {
  return (
    <PublicPageLayout
      title="Exhibit at AIAIAC Africa 2027 | Industrial Technology & Solutions Showcase"
      description="Book your exhibition stand at AIAIAC Africa 2027 in Lagos, Nigeria. Connect directly with energy operators, EPC contractors, maintenance heads, and procurement decision-makers."
      canonical="/exhibition"
      schema={createBreadcrumbSchema([
        { name: "Home", item: "/" },
        { name: "Exhibition", item: "/exhibition" },
      ])}
    >
      {/* 1. Hero: Dark Media Hero */}
      <HeroSection />

      {/* 2. Why Exhibit: Warm Ivory */}
      <WhyExhibitSection />

      {/* 3. Exhibition in Action / Scale: White */}
      <ExhibitionVisualSection />

      {/* 4. Industry Areas / Exhibition Profile: Soft Sage */}
      <IndustryAreasSection />

      {/* 5. Who You Will Meet / Audience: Dark Green */}
      <AudienceSection />

      {/* 6. Exhibition Stand Options: Warm Ivory */}
      <ExhibitionOptionsSection />

      {/* 7. Participating Organisations: White */}
      <ParticipatingOrganisationsSection />

      {/* 8. Exhibition Enquiry: Dark Green */}
      <ExhibitionEnquirySection />
    </PublicPageLayout>
  );
}
