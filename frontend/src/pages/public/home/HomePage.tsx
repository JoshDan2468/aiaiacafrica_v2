import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { WelcomeModal } from "./WelcomeModal";
import { confirmedEventSchema, confirmedOrgSchema } from "@/components/common/SEO";
import { EventStatistics } from "@/components/home/EventStatistics";
import { AdvisoryBoardSection } from "./AdvisoryBoardSection";
import { CommitteeRailSection } from "./CommitteeRailSection";
import { ConferenceTeamSection } from "./ConferenceTeamSection";
import { ConferenceTracksSection } from "./ConferenceTracksSection";
import { EventOverviewSection } from "./EventOverviewSection";
import { HeroSection } from "./HeroSection";
import { OfficialThemeSection } from "./OfficialThemeSection";
import { OrganisingCommitteeSection } from "./OrganisingCommitteeSection";
import { ParticipatingCompaniesSection } from "./ParticipatingCompaniesSection";
import { PreviousConferenceVideoSection } from "./PreviousConferenceVideoSection";
import { RegistrationShortcutsSection } from "./RegistrationShortcutsSection";
import { SpeakerArchiveSection } from "./SpeakerArchiveSection";
import { SponsorArchiveSection } from "./SponsorArchiveSection";
import { TechnicalChairmanMessageSection } from "./TechnicalChairmanMessageSection";

export function HomePage() {
  return (
    <PublicPageLayout
      title="AIAIAC Africa 2027 | Asset Integrity, AI, Automation & Cybersecurity"
      description="AIAIAC Africa 2027 brings together leaders in asset integrity, artificial intelligence, automation and cybersecurity in Lagos, Nigeria, 22–23 June 2027."
      canonical="/"
      schema={[confirmedEventSchema, confirmedOrgSchema]}
    >
      <WelcomeModal />
      {/* 1. HERO */}
      <HeroSection />

      {/* 2. INVITATION TO ATTEND */}
      <TechnicalChairmanMessageSection />

      {/* 3. ADVISORY BOARD */}
      {/* 3. KEY CONFERENCE STATISTICS */}
      <EventStatistics />

      {/* 4. ADVISORY BOARD */}
      <AdvisoryBoardSection />

      {/* 4. PARTICIPATING COMPANIES */}
      <ParticipatingCompaniesSection />

      {/* 5. FOUR SPECIALISED CONFERENCES */}
      <ConferenceTracksSection />

      {/* 6, 7 & 8. TECHNICAL COMMITTEES (Asset Integrity -> AI -> Automation & Cybersecurity) */}
      <CommitteeRailSection />

      {/* 9. PREVIOUS CONFERENCE HIGHLIGHTS */}
      <PreviousConferenceVideoSection />

      {/* 10. FEATURED SPEAKERS */}
      <SpeakerArchiveSection />

      {/* 11. EVENT OVERVIEW */}
      <EventOverviewSection />
      <OfficialThemeSection />

      {/* 12. CONFERENCE TEAM */}
      <ConferenceTeamSection />

      {/* 13. PARTNER ECOSYSTEM */}
      <SponsorArchiveSection />

      {/* 14. ORGANISING COMMITTEE */}
      <OrganisingCommitteeSection />

      {/* LOWER PAGE CONTENT & SHORTCUTS */}
      <RegistrationShortcutsSection />
    </PublicPageLayout>
  );
}
