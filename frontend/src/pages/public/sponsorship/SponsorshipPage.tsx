import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { createBreadcrumbSchema } from "@/components/common/SEO";
import { HeroSection } from "./HeroSection";
import { WhyPartnerSection } from "./WhyPartnerSection";
import { SponsorshipVisualSection } from "./SponsorshipVisualSection";
import { SponsorshipPackagesSection } from "./SponsorshipPackagesSection";
import { EnquiryCtaSection } from "./EnquiryCtaSection";
import { ConfirmedSponsors } from "@/components/partners/ConfirmedSponsors";

export function SponsorshipPage() {
  return (
    <PublicPageLayout
      title="AIAIAC Africa 2027 Sponsorship Opportunities | Partner Packages"
      description="Position your brand as an industry leader. Explore headline, track, and strategic sponsorship packages for AIAIAC Africa 2027 in Lagos, Nigeria."
      canonical="/sponsorship"
      schema={createBreadcrumbSchema([
        { name: "Home", item: "/" },
        { name: "Sponsorship", item: "/sponsorship" },
      ])}
    >
      <HeroSection />
      <WhyPartnerSection />
      <SponsorshipVisualSection />
      <ConfirmedSponsors />
      <SponsorshipPackagesSection />
      <EnquiryCtaSection />
    </PublicPageLayout>
  );
}
