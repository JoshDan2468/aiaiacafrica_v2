import { Link } from "react-router-dom";
import { CircularPersonProfile } from "@/components/common/CircularPersonProfile";
import { previousEditionSpeakers } from "@/data/speakers";
import type { RosterPerson } from "@/data/speakersRoster";

interface PreviousSpeakersSectionProps {
  onSelectSpeaker?: (speaker: RosterPerson) => void;
}

export function PreviousSpeakersSection({ onSelectSpeaker }: PreviousSpeakersSectionProps) {
  // Select 4 representative historical speakers for the teaser
  const representativeSpeakers = previousEditionSpeakers.slice(0, 4);

  return (
    <section id="previous-speakers" className="bg-[#F5F2E9] py-20 text-[#102C20] sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-[32px] font-extrabold uppercase tracking-tight text-[#102C20] sm:text-[38px] lg:text-[44px]">
              Previous Speakers
            </h2>
            <p className="mt-3 text-base leading-[1.65] text-[#3E5246] sm:text-[17px]">
              Explore speakers who contributed to previous editions of the conference.
            </p>
          </div>

          <div className="shrink-0">
            <Link
              to="/speakers/archive"
              className="inline-flex h-[48px] items-center justify-center rounded-[12px] border border-[#214A36] bg-transparent px-6 text-sm font-bold text-[#102C20] transition hover:bg-[#214A36] hover:text-[#FAF8F2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#214A36]"
            >
              View Previous Speakers Archive →
            </Link>
          </div>
        </div>

        {/* 4 Representative Historical Speaker Profiles (Section 27) */}
        <ul className="mt-14 grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-12">
          {representativeSpeakers.map((speaker) => (
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
                  onSelectSpeaker?.({
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
      </div>
    </section>
  );
}
