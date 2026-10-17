import { CompanyLogoBadge } from "@/components/common/CompanyLogoBadge";
import { CountryBadge } from "@/components/common/CountryFlag";
import { currentKeynoteSpeaker } from "@/data/speakers";
import type { RosterPerson } from "@/data/speakersRoster";

interface KeynoteSectionProps {
  onSelectSpeaker?: (speaker: RosterPerson) => void;
}

export function KeynoteSection({ onSelectSpeaker }: KeynoteSectionProps) {
  const handleOpenModal = () => {
    if (onSelectSpeaker) {
      onSelectSpeaker({
        id: currentKeynoteSpeaker.id,
        name: currentKeynoteSpeaker.name,
        role: currentKeynoteSpeaker.role,
        organisation: currentKeynoteSpeaker.organisation,
        organisationKey: currentKeynoteSpeaker.organisationKey,
        countryCode: currentKeynoteSpeaker.countryCode,
        image: currentKeynoteSpeaker.image,
        categories: ["Keynote Speaker"],
        bio: "Guiding the development and commissioning of one of Nigeria's landmark gas processing facilities, Dr. Makinde delivers the opening strategic plenary address at AIAIAC Africa 2027, addressing large-scale asset lifecycle integrity, operational reliability, and regional infrastructure resilience.",
      });
    }
  };

  return (
    <section id="keynote-speaker" className="bg-[#071C13] py-20 text-[#F7F5EF] sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <div>
          <h2 className="font-display text-[32px] font-extrabold uppercase tracking-tight text-[#F7F5EF] sm:text-[38px] lg:text-[44px]">
            Keynote Speaker
          </h2>
        </div>

        {/* Dedicated Premium Keynote Feature Layout (Sections 7-9) */}
        <div className="mt-12 grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
          {/* Left: Dominant 280-320px Circular Portrait (~45%) */}
          <div className="flex justify-center lg:col-span-5">
            <div className="relative">
              <div className="relative size-[200px] overflow-hidden rounded-full border-4 border-[#315847] bg-[#0A261A] shadow-2xl sm:size-[250px] lg:size-[310px]">
                {/* Subtle lime accent arc on upper border */}
                <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-r-[#CFEA3B]/40 border-t-[#CFEA3B] border-b-transparent border-l-transparent" />
                <img
                  src={currentKeynoteSpeaker.image}
                  alt={`Portrait of ${currentKeynoteSpeaker.name}`}
                  width={310}
                  height={310}
                  loading="eager"
                  decoding="async"
                  className="h-full w-full object-cover object-top opacity-100"
                />
              </div>

              {/* Lower-left: Country Flag Badge (Nigeria) */}
              <div className="absolute bottom-2 left-2 z-20 drop-shadow-md sm:bottom-3 sm:left-3">
                <CountryBadge code={currentKeynoteSpeaker.countryCode || "NG"} />
              </div>

              {/* Lower-right: Official ANOH Company Logo Badge */}
              <div className="absolute bottom-2 right-2 z-20 drop-shadow-md sm:bottom-3 sm:right-3">
                <CompanyLogoBadge
                  organisationKey={currentKeynoteSpeaker.organisationKey || "anoh"}
                  organisationName={currentKeynoteSpeaker.organisation}
                  aspect="wide"
                />
              </div>
            </div>
          </div>

          {/* Right: Keynote Metadata & Statement (~55%) */}
          <div className="text-center lg:col-span-7 lg:text-left">
            <h3 className="font-display text-[30px] font-bold tracking-tight text-[#F7F5EF] sm:text-[36px] lg:text-[42px]">
              {currentKeynoteSpeaker.name}
            </h3>

            <p className="mt-2 text-[17px] font-medium text-[#CADB7E] sm:text-[18px] lg:text-[19px]">
              {currentKeynoteSpeaker.role}
            </p>

            <p className="mt-1 text-[16px] font-semibold text-[#B8C5BC] sm:text-[17px]">
              {currentKeynoteSpeaker.organisation}
            </p>

            <p className="mt-6 max-w-[620px] text-base leading-[1.72] text-[#B8C5BC] sm:text-[17px]">
              Guiding the development and commissioning of one of Nigeria&apos;s landmark gas
              processing facilities, Dr. Makinde delivers the opening strategic plenary address at
              AIAIAC Africa 2027, addressing large-scale asset lifecycle integrity, operational
              reliability, and regional infrastructure resilience.
            </p>

            <div className="mt-8 flex justify-center lg:justify-start">
              <button
                type="button"
                onClick={handleOpenModal}
                className="inline-flex h-[50px] items-center justify-center rounded-[12px] bg-[#173D2D] px-7 text-[15px] font-semibold text-[#F7F5EF] transition hover:bg-[#20523C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CFEA3B]"
              >
                View Full Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
