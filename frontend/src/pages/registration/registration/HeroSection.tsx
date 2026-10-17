import { AnimatedSection } from "@/components/common/AnimatedSection";
import heroImg from "@/data/AIAC_images/image20.jpg";

export function HeroSection() {
  return (
    <section
      id="registration-hero"
      className="relative w-full overflow-hidden bg-[#05190F] pb-16 pt-32 text-[#F7F5EF] sm:pb-20 sm:pt-36 lg:pb-24 lg:pt-40"
    >
      <div className="shell max-w-[1240px]">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Left Column: 48-52% */}
          <AnimatedSection once className="lg:col-span-6 xl:col-span-6">
            <p className="eyebrow mb-5 text-lime">Registration • 2027</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#F7F5EF] sm:text-5xl lg:text-[60px] lg:leading-[1.1]">
              Your place at AIAIAC Africa 2027
            </h1>
            <p className="mt-5 text-[17px] leading-relaxed text-[#BCC8C0] sm:text-[18px]">
              Connect with the people shaping Africa’s energy industry. Choose your registration
              category and take the next step.
            </p>

            {/* Event Information Block */}
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] font-medium text-[#EAEFEA]">
              <span className="font-display font-bold text-[#F7F5EF]">AIAIAC Africa 2027</span>
              <span className="text-white/30">•</span>
              <span>22–23 June 2027</span>
              <span className="text-white/30">•</span>
              <span>Lagos, Nigeria</span>
            </div>
          </AnimatedSection>

          {/* Right Column: 48-52% Real Conference Photograph */}
          <AnimatedSection delay={0.1} once className="hidden lg:col-span-6 lg:block xl:col-span-6">
            <div className="relative overflow-hidden border border-[#173D2D]/60">
              <img
                src={heroImg}
                alt="Delegates and attendees gathered at AIAIAC Africa conference"
                className="h-[380px] w-full object-cover lg:h-[390px]"
                loading="eager"
              />
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
