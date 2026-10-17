import { AnimatedSection } from "@/components/common/AnimatedSection";
import { organisations } from "@/data/organisations";

const featuredOrgKeys = [
  "nnpc",
  "shell",
  "totalenergies",
  "nlng",
  "exxonmobil",
  "aramco",
  "seplat",
  "dangote",
  "adnoc",
  "sonangol",
  "hitachi",
  "jotun",
  "cenosco",
  "ghana-gas",
  "ptdf",
  "bp",
  "anoh",
  "aie",
] as const;

export function ParticipatingOrganisationsSection() {
  const orgList = featuredOrgKeys
    .map((key) => organisations[key])
    .filter((org): org is NonNullable<typeof org> & { logo: string } => Boolean(org && org.logo));

  return (
    <section className="bg-white py-20 text-[#102C20] lg:py-24">
      <div className="shell max-w-[1280px]">
        <AnimatedSection className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-[#102C20] sm:text-4xl lg:text-[42px]">
            Previous Participating Organisations
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#4A5D52] sm:text-[17px]">
            Energy operators, national oil companies, engineering service providers, and technology
            leaders represented at previous editions of the conference.
          </p>
        </AnimatedSection>

        {/* Clean Logo Grid in Original Natural Colours with Restrained Tiles */}
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-5">
          {orgList.map((org, index) => (
            <AnimatedSection
              key={org.name}
              delay={index * 0.02}
              className="flex h-24 sm:h-28 items-center justify-center rounded-[12px] bg-white p-4 sm:p-5 border border-[#102C20]/10 shadow-xs transition-shadow hover:shadow-sm"
            >
              <img
                src={org.logo}
                alt={`${org.name} logo`}
                loading="lazy"
                decoding="async"
                className="max-h-[52px] sm:max-h-[60px] w-auto max-w-[140px] sm:max-w-[155px] object-contain"
              />
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
