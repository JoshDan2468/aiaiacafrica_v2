import { AnimatedSection } from "@/components/common/AnimatedSection";
import { sponsors } from "@/data/sponsors";

export function MediaPartnersSection() {
  const mediaPartners = sponsors.filter((item) => item.tier === "media");

  if (mediaPartners.length === 0) {
    return null;
  }

  return (
    <section className="bg-[#F5F2E9] py-20 text-[#102C20] sm:py-24 lg:py-28">
      <div className="shell">
        <AnimatedSection once className="max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl lg:text-[44px]">
            Media Partners
          </h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-[#3F5347] sm:text-[17px]">
            Industry publications, trade journals, and media organisations supporting regional
            technical reporting and event coverage.
          </p>
        </AnimatedSection>

        {/* Clean Logo Grid - Height 48-68px, opacity 1, natural logo colours */}
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 sm:gap-5">
          {mediaPartners.map((item) => {
            const isWhiteLogo = false;
            return (
              <div
                key={item.id}
                className={`flex h-28 items-center justify-center rounded-[14px] p-5 sm:h-32 sm:p-6 shadow-xs transition-transform duration-200 hover:scale-[1.01] ${
                  isWhiteLogo
                    ? "bg-[#0B2117] ring-1 ring-white/10"
                    : "bg-[#FFFFFF] ring-1 ring-black/5"
                }`}
              >
                <img
                  src={item.logo}
                  alt={item.name ? `${item.name} logo` : "AIAIAC Media Partner logo"}
                  width="200"
                  height="80"
                  loading="eager"
                  decoding="async"
                  style={{ opacity: 1 }}
                  className="max-h-14 sm:max-h-16 w-auto max-w-[85%] object-contain opacity-100"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
