import { AnimatedSection } from "@/components/common/AnimatedSection";
import { organisations } from "@/data/organisations";

const previousPartnerKeys = [
  "cenosco",
  "shell",
  "seplat",
  "totalenergies",
  "nlng",
  "nnpc",
  "exxonmobil",
  "aramco",
  "pti",
  "ptdf",
  "aie",
  "arridex",
  "csean",
  "dangote",
  "adnoc",
  "hitachi",
  "jotun",
  "sonangol",
] as const;

export function PartnerArchiveSection() {
  const partnerList = previousPartnerKeys
    .map((key) => organisations[key])
    .filter((org): org is NonNullable<typeof org> & { logo: string } => Boolean(org && org.logo));

  return (
    <section className="bg-[#F5F2E9] py-20 text-[#102C20] sm:py-24 lg:py-28">
      <div className="shell">
        <AnimatedSection className="max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl lg:text-[42px]">
            Previous Partners and Participating Organisations
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#3F5347]">
            Organisations and industry stakeholders that have supported and participated in previous
            AIAIAC Africa editions across energy, maritime, and infrastructure.
          </p>
        </AnimatedSection>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-5">
          {partnerList.map((org, index) => (
            <AnimatedSection
              key={org.name}
              delay={(index % 6) * 0.03}
              className="flex h-24 items-center justify-center rounded-[14px] bg-[#FFFFFF] p-4 shadow-xs sm:h-28 sm:p-5"
            >
              <img
                src={org.logo}
                alt={`${org.name} logo`}
                width="160"
                height="60"
                loading="lazy"
                decoding="async"
                className="max-h-12 w-auto max-w-full object-contain"
              />
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
