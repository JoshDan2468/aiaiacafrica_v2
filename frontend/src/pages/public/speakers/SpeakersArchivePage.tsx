import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { createBreadcrumbSchema } from "@/components/common/SEO";
import { CircularPersonProfile } from "@/components/common/CircularPersonProfile";
import { SpeakerDetailModal } from "@/components/speakers/SpeakerDetailModal";
import { previousEditionSpeakers } from "@/data/speakers";
import type { RosterPerson } from "@/data/speakersRoster";

export function SpeakersArchivePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModalSpeaker, setActiveModalSpeaker] = useState<RosterPerson | null>(null);

  const filteredSpeakers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return previousEditionSpeakers;
    return previousEditionSpeakers.filter((s) => {
      const matchName = s.name.toLowerCase().includes(q);
      const matchOrg = s.organisation.toLowerCase().includes(q);
      const matchRole = s.role.toLowerCase().includes(q);
      return matchName || matchOrg || matchRole;
    });
  }, [searchQuery]);

  return (
    <PublicPageLayout
      title="Previous Speakers Archive | AIAIAC Africa"
      description="Browse the historical archive of speakers, authors, and industry panelists who contributed to previous editions of the AIAIAC conference."
      canonical="/speakers/archive"
      schema={createBreadcrumbSchema([
        { name: "Home", item: "/" },
        { name: "Speakers", item: "/speakers" },
        { name: "Archive", item: "/speakers/archive" },
      ])}
    >
      {/* Archive Header */}
      <header className="relative w-full overflow-hidden bg-[#F5F2E9] pb-16 pt-32 text-[#102C20] sm:pb-20 sm:pt-36 lg:pb-24 lg:pt-40">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
          <div className="mb-6">
            <Link
              to="/speakers"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#214A36] transition hover:text-[#102C20]"
            >
              ← Back to 2027 Speakers
            </Link>
          </div>

          <div className="max-w-3xl">
            <h1 className="font-display text-[40px] font-extrabold uppercase leading-[0.98] tracking-tight text-[#102C20] sm:text-[52px] lg:text-[60px]">
              Previous Speakers Archive
            </h1>
            <p className="mt-4 text-base leading-[1.68] text-[#3E5246] sm:text-[17px] lg:text-[18px]">
              Explore the 25 distinguished specialists, technical authorities, and operations
              leaders who presented and shared industry case studies at previous conference
              editions.
            </p>

            {/* Archive Search Bar */}
            <div className="mt-8 max-w-[500px]">
              <div className="relative flex h-[50px] w-full items-center rounded-[14px] border border-[#CBD5C8] bg-white px-4 shadow-xs transition-colors focus-within:border-[#214A36] focus-within:ring-2 focus-within:ring-[#214A36]/15">
                <svg
                  className="size-5 shrink-0 text-[#214A36]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search previous speakers..."
                  aria-label="Search previous speakers"
                  className="ml-3 w-full bg-transparent text-sm font-medium text-[#102C20] placeholder-[#6B7D73] focus:outline-none sm:text-base"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="ml-2 rounded-full p-1 text-[#6B7D73] hover:bg-[#F5F2E9] hover:text-[#102C20]"
                    aria-label="Clear search"
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Complete 25-Person Archive Grid on Soft Sage */}
      <main className="bg-[#E8EEE8] py-20 text-[#102C20] sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between border-b border-[#CBD5C8] pb-6">
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-[#102C20]">
              Historical Roster ({filteredSpeakers.length})
            </h2>
            <span className="text-sm font-medium text-[#4A5850]">Previous Conference Editions</span>
          </div>

          {filteredSpeakers.length === 0 ? (
            <div className="mt-16 flex flex-col items-center justify-center rounded-[16px] border border-[#CBD5C8] bg-white/60 p-12 text-center">
              <p className="text-lg font-bold text-[#102C20]">No archive speakers found</p>
              <p className="mt-2 text-sm text-[#4A5850]">
                Try adjusting your search terms to find historical speakers.
              </p>
            </div>
          ) : (
            <ul className="mt-14 grid grid-cols-2 gap-x-8 gap-y-14 sm:grid-cols-3 sm:gap-x-10 sm:gap-y-16 lg:grid-cols-4 lg:gap-x-12 lg:gap-y-20">
              {filteredSpeakers.map((speaker) => (
                <li key={speaker.id} className="flex justify-center opacity-100">
                  <CircularPersonProfile
                    name={speaker.name}
                    role={speaker.role}
                    organisation={speaker.organisation}
                    organisationKey={speaker.organisationKey}
                    countryCode={speaker.countryCode}
                    image={speaker.image}
                    tone="light"
                    size="directory"
                    onClick={() =>
                      setActiveModalSpeaker({
                        id: speaker.id,
                        name: speaker.name,
                        role: speaker.role,
                        organisation: speaker.organisation,
                        organisationKey: speaker.organisationKey,
                        countryCode: speaker.countryCode,
                        image: speaker.image,
                        categories: ["Previous Speakers"],
                        track: speaker.track,
                      })
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

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
export default SpeakersArchivePage;
