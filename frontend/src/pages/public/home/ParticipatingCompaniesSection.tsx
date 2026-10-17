import { AnimatedSection } from "@/components/common/AnimatedSection";
import { participatingCompanies } from "@/data/homepage";

export function ParticipatingCompaniesSection() {
  const displayLogos = participatingCompanies;
  if (displayLogos.length === 0) return null;

  return (
    <section
      aria-label="Participating companies and partners"
      className="relative overflow-hidden bg-[#061810] py-10 text-white sm:py-12"
    >
      <AnimatedSection className="w-full">
        {/* Continuous Horizontal Logo Rail (Edge-to-Edge) */}
        <div className="logo-loop" aria-label="Participating companies scroll rail">
          <div className="logo-loop__track">
            <ul className="logo-loop__group">
              {displayLogos.map((item) => (
                <li
                  key={item.id}
                  className="logo-loop__item flex shrink-0 items-center justify-center rounded-xl bg-white px-6 py-4 text-center shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <img
                    src={item.logo}
                    alt={item.name}
                    width={180}
                    height={72}
                    loading="lazy"
                    decoding="async"
                    className="max-h-14 w-auto max-w-40 object-contain opacity-95 transition-all duration-300 hover:scale-105 hover:opacity-100 sm:max-h-16"
                  />
                </li>
              ))}
            </ul>
            <ul className="logo-loop__group" aria-hidden="true">
              {displayLogos.map((item) => (
                <li
                  key={`clone-${item.id}`}
                  className="logo-loop__item flex shrink-0 items-center justify-center rounded-xl bg-white px-6 py-4 text-center shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <img
                    src={item.logo}
                    alt=""
                    width={180}
                    height={72}
                    loading="lazy"
                    decoding="async"
                    className="max-h-14 w-auto max-w-40 object-contain opacity-95 transition-all duration-300 hover:scale-105 hover:opacity-100 sm:max-h-16"
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}
