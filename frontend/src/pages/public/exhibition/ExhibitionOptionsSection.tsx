import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { exhibitionShellSchemeItems, exhibitionStandPackages } from "@/data/brochure";

export function ExhibitionOptionsSection() {
  return (
    <section
      id="exhibition-stands"
      aria-labelledby="exhibition-options-title"
      className="bg-[#FAF8F2] py-20 text-[#102C20] lg:py-24"
    >
      <div className="shell max-w-[1280px]">
        <AnimatedSection className="max-w-3xl">
          <h2
            id="exhibition-options-title"
            className="font-display text-3xl font-bold tracking-tight text-[#102C20] sm:text-4xl lg:text-[44px]"
          >
            Exhibition Options
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#4A5D52] sm:text-[17px]">
            Stand configurations range from single shell scheme units to expansive island spaces.
            Every package includes turnkey shell construction, electrical utilities, and full
            exhibitor delegate credentials.
          </p>
        </AnimatedSection>

        {/* 3 Contained Commercial Stand Cards (Spacious, Zero Pricing, Dominant 34-36px Size) */}
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {exhibitionStandPackages.map((stand, index) => {
            const sizeLabel =
              stand.id === "9sqm" ? "9 sqm" : stand.id === "18sqm" ? "18 sqm" : "36 sqm";
            return (
              <AnimatedSection key={stand.id} delay={index * 0.05}>
                <article className="flex min-h-[420px] flex-col justify-between rounded-[20px] bg-[#F6F2E8] p-8 shadow-xs transition-shadow hover:shadow-md sm:p-9">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold uppercase tracking-wider text-[#2D5443]">
                        Shell Scheme
                      </span>
                      {stand.detail && (
                        <span className="rounded-md bg-[#E8E2D5] px-2.5 py-1 text-xs font-semibold text-[#102C20]">
                          {stand.detail}
                        </span>
                      )}
                    </div>

                    {/* Visually Dominant Stand Size */}
                    <div className="mt-6">
                      <div className="font-display text-[34px] font-bold tracking-tight text-[#102C20] sm:text-[36px]">
                        {sizeLabel}
                      </div>
                      <div className="mt-1 text-[15px] font-semibold text-[#58675F]">
                        Stand Space
                      </div>
                    </div>

                    {stand.scope && (
                      <p className="mt-4 text-[15px] leading-relaxed text-[#4A5D52]">
                        {stand.scope}
                      </p>
                    )}

                    {stand.highlights && (
                      <ul className="mt-7 space-y-3 border-t border-[#102C20]/10 pt-6 text-[15px] leading-[1.55] text-[#3C4E43]">
                        {stand.highlights.map((highlight) => (
                          <li key={highlight} className="flex items-start gap-3">
                            <span
                              className="mt-0.5 shrink-0 text-base font-bold text-[#173D2D]"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-9 border-t border-[#102C20]/10 pt-6">
                    <a
                      href="#enquiry"
                      className="inline-flex h-[50px] w-full items-center justify-center rounded-[14px] bg-[#173D2D] px-6 text-sm font-bold tracking-wide text-[#F7F5EF] transition-all hover:bg-[#102C20] hover:text-[#CFEA3B] active:translate-y-0.5 sm:w-auto"
                    >
                      Enquire About This Stand
                    </a>
                  </div>
                </article>
              </AnimatedSection>
            );
          })}
        </div>

        {/* Clean Textual Shell Scheme Inclusions List (No pill boxes, no capsule chips) */}
        <AnimatedSection delay={0.15} className="mt-14 rounded-[20px] bg-[#EDE8DC] p-8 sm:p-11">
          <div className="max-w-2xl">
            <h3 className="font-display text-[24px] font-bold text-[#102C20] sm:text-[26px]">
              Standard Shell Scheme Includes
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-[#4A5D52] sm:text-[16px]">
              All shell scheme stands are built to international safety standards and ready for
              exhibitor equipment setup prior to event opening.
            </p>
          </div>

          <div className="mt-8 grid gap-x-8 gap-y-3.5 text-[15px] text-[#102C20] sm:grid-cols-2 lg:grid-cols-3">
            {exhibitionShellSchemeItems.map((item) => (
              <div key={item} className="flex items-center gap-3 py-1 font-medium">
                <span className="size-2 shrink-0 rounded-full bg-[#173D2D]" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#102C20]/10 pt-6">
            <p className="text-[15px] text-[#4A5D52]">
              Custom space-only builds and high-voltage power hookups are available upon commercial
              request.
            </p>
            <Link
              to="/registration/exhibitor"
              className="text-[15px] font-bold text-[#173D2D] underline underline-offset-4 hover:text-[#071C13]"
            >
              Submit custom stand enquiry &rarr;
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
