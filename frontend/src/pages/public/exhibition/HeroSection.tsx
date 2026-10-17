import { BrochureDownload } from "@/components/common/BrochureDownload";
import { ActionLink } from "@/components/common/ActionButton";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import heroExhibitionImg from "@/data/AIAC_images/image27.jpg";
import { conference } from "@/data/conference";

export function HeroSection() {
  return (
    <header className="relative min-h-[640px] w-full overflow-hidden bg-[#071C13] pb-24 pt-32 text-[#F7F5EF] sm:min-h-[680px] sm:pb-28 sm:pt-36 lg:min-h-[720px] lg:pb-32 lg:pt-40">
      {/* Subtle ambient tone background */}
      <div className="absolute inset-0 -z-10 bg-radial from-[#123326]/40 via-[#071C13] to-[#071C13]" />

      <div className="shell relative z-10 max-w-[1280px]">
        <div className="grid items-center gap-12 lg:grid-cols-[46%_1fr] lg:gap-14">
          {/* Left Column: Content (~46%) */}
          <AnimatedSection className="w-full">
            <h1 className="font-display text-4xl font-bold tracking-tight text-[#F7F5EF] sm:text-5xl lg:text-[60px] xl:text-[66px] lg:leading-[1.08]">
              Exhibit at <br />
              <span className="text-[#CFEA3B]">AIAIAC Africa 2027</span>
            </h1>

            <p className="mt-6 max-w-[600px] text-[17px] leading-relaxed text-[#CAD7CE] sm:text-[18px]">
              Present your technologies, equipment, and specialised engineering solutions directly
              to senior energy operators, EPC contractors, maintenance heads, and procurement
              decision-makers across West Africa.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] font-semibold tracking-wide text-[#CADB7E] sm:text-[16px]">
              <span>22–23 June 2027</span>
              <span className="text-[#CADB7E]/50" aria-hidden="true">
                •
              </span>
              <span>{conference.venue}</span>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <ActionLink
                to="/registration/exhibitor"
                variant="primary"
                className="h-[52px] rounded-[14px] bg-[#CFEA3B] px-6 text-base font-bold text-[#102C20] shadow-md hover:bg-[#d9f243]"
              >
                Make an Exhibition Enquiry
              </ActionLink>

              <BrochureDownload
                className="inline-flex min-h-[52px] items-center justify-center rounded-[14px] border border-white/20 bg-[#173D2D] px-6 text-base font-semibold text-[#F7F5EF] hover:bg-[#1f4e3a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime"
                unavailableClassName="text-xs text-white/75"
              />
            </div>
          </AnimatedSection>

          {/* Right Column: Prominent Exhibition Media (~54%) */}
          <AnimatedSection delay={0.08} className="w-full">
            <div className="relative h-[400px] w-full overflow-hidden rounded-[22px] border border-white/15 bg-[#0D2C20] shadow-2xl sm:h-[480px] lg:h-[530px] xl:h-[550px]">
              <img
                src={heroExhibitionImg}
                alt="AIAIAC Africa official exhibition stand, company showcase and delegates interacting at the conference"
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover object-top"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071C13]/50 via-transparent to-transparent" />
            </div>
          </AnimatedSection>
        </div>
      </div>
    </header>
  );
}
