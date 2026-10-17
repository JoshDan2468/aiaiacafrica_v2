import { CircularPersonProfile } from "@/components/common/CircularPersonProfile";
import { featuredSpeakers } from "@/data/speakers";
import type { RosterPerson } from "@/data/speakersRoster";

interface FeaturedSpeakersSectionProps {
  onSelectSpeaker?: (speaker: RosterPerson) => void;
}

export function FeaturedSpeakersSection({ onSelectSpeaker }: FeaturedSpeakersSectionProps) {
  return (
    <section id="featured-speakers" className="bg-[#FAF8F2] py-20 text-[#102C20] sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <div className="max-w-2xl">
          <h2 className="font-display text-[32px] font-extrabold uppercase tracking-tight text-[#102C20] sm:text-[38px] lg:text-[44px]">
            Featured Speakers
          </h2>
          <p className="mt-4 text-base leading-[1.65] text-[#3E5246] sm:text-[17px]">
            Engineering specialists, operations leaders, and researchers presenting operational case
            studies, breakthrough methodologies, and technical benchmarks.
          </p>
        </div>

        {/* 4-Column Responsive Grid (Sections 11 & 36) */}
        <ul className="mt-14 grid grid-cols-2 gap-x-8 gap-y-14 sm:grid-cols-3 sm:gap-x-10 sm:gap-y-16 lg:grid-cols-4 lg:gap-x-12 lg:gap-y-20">
          {featuredSpeakers.map((speaker) => (
            <li key={speaker.id} className="flex justify-center opacity-100">
              <CircularPersonProfile
                name={speaker.name}
                role={speaker.role}
                organisation={speaker.organisation}
                organisationKey={speaker.organisationKey}
                countryCode={speaker.countryCode}
                image={speaker.image}
                tone="light"
                size="featured"
                onClick={() =>
                  onSelectSpeaker?.({
                    id: speaker.id,
                    name: speaker.name,
                    role: speaker.role,
                    organisation: speaker.organisation,
                    organisationKey: speaker.organisationKey,
                    countryCode: speaker.countryCode,
                    image: speaker.image,
                    categories: ["Featured Speakers"],
                    track: speaker.track,
                  })
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
