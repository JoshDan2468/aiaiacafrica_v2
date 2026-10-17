import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { createBreadcrumbSchema } from "@/components/common/SEO";
import { HeroSection } from "./HeroSection";
import { LatestUpdatesSection } from "./LatestUpdatesSection";
import { EventHighlightsSection } from "./EventHighlightsSection";
import { GallerySection } from "./GallerySection";
import { MediaResourcesSection } from "./MediaResourcesSection";
import { MediaPartnersSection } from "./MediaPartnersSection";
import { ParticipationCtaSection } from "./ParticipationCtaSection";

export function MediaPage() {
  return (
    <PublicPageLayout
      title="Media & Event Highlights | AIAIAC Africa 2027"
      description="Official newsroom, event updates, video highlights, photo gallery, media resources and press accreditation for AIAIAC Africa 2027 in Lagos, Nigeria."
      canonical="/media"
      schema={createBreadcrumbSchema([
        { name: "Home", item: "/" },
        { name: "Media", item: "/media" },
      ])}
    >
      <HeroSection />
      <LatestUpdatesSection />
      <EventHighlightsSection />
      <GallerySection />
      <MediaResourcesSection />
      <MediaPartnersSection />
      <ParticipationCtaSection />
    </PublicPageLayout>
  );
}
