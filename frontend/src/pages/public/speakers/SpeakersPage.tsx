import { useState } from "react";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { createBreadcrumbSchema } from "@/components/common/SEO";
import { SpeakerDetailModal } from "@/components/speakers/SpeakerDetailModal";
import type { RosterPerson } from "@/data/speakersRoster";
import { HeroSection } from "./HeroSection";
import { KeynoteSection } from "./KeynoteSection";
import { FeaturedSpeakersSection } from "./FeaturedSpeakersSection";
import { DirectorySection } from "./DirectorySection";
import { PreviousSpeakersSection } from "./PreviousSpeakersSection";
import { ParticipationCtaSection } from "./ParticipationCtaSection";

export function SpeakersPage() {
  const [activeModalSpeaker, setActiveModalSpeaker] = useState<RosterPerson | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <PublicPageLayout
      title="Keynote & Featured Speakers | AIAIAC Africa 2027"
      description="Meet the distinguished keynote speakers, technical authorities, and industry panelists presenting at AIAIAC Africa 2027 in Lagos, Nigeria."
      canonical="/speakers"
      schema={createBreadcrumbSchema([
        { name: "Home", item: "/" },
        { name: "Speakers", item: "/speakers" },
      ])}
    >
      <HeroSection searchQuery={searchQuery} onSearchChange={handleSearchChange} />
      <KeynoteSection onSelectSpeaker={setActiveModalSpeaker} />
      <FeaturedSpeakersSection onSelectSpeaker={setActiveModalSpeaker} />
      <DirectorySection
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSelectSpeaker={setActiveModalSpeaker}
      />
      <PreviousSpeakersSection onSelectSpeaker={setActiveModalSpeaker} />
      <ParticipationCtaSection />

      <SpeakerDetailModal
        speaker={activeModalSpeaker}
        open={Boolean(activeModalSpeaker)}
        onOpenChange={(open) => {
          if (!open) setActiveModalSpeaker(null);
        }}
      />
    </PublicPageLayout>
  );
}
export default SpeakersPage;
