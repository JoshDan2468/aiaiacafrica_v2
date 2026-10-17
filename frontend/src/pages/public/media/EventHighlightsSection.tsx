import { AnimatedSection } from "@/components/common/AnimatedSection";
import highlightImage1 from "@/data/AIAC_images/image5.jpg";
import highlightImage2 from "@/data/AIAC_images/image7.jpg";

export function EventHighlightsSection() {
  return (
    <section id="highlights" className="bg-[#071C13] py-20 text-[#F7F5EF] sm:py-24 lg:py-28">
      <div className="shell">
        <AnimatedSection once className="max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#F7F5EF] sm:text-4xl lg:text-[44px]">
            Event Highlights
          </h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-[#BCC8C0] sm:text-[17px]">
            Watch highlights from the previous conference and explore selected moments from the
            event.
          </p>
        </AnimatedSection>

        {/* Video Feature (~67% width) + Curated Real Photographs (~33% width) */}
        <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* Main Video Highlight */}
          <AnimatedSection once className="lg:col-span-8">
            <div className="overflow-hidden rounded-[20px] bg-[#0A2619] shadow-2xl ring-1 ring-white/10">
              <video
                controls
                playsInline
                preload="metadata"
                poster="/assets/aiaiac-2027/video-posters/previous-conference-poster.webp"
                className="aspect-16/9 w-full object-cover"
              >
                <source
                  src="/assets/aiaiac-2027/videos/aiaiac-previous-conference.mp4"
                  type="video/mp4"
                />
                Your browser does not support HTML5 video.
              </video>
            </div>
          </AnimatedSection>

          {/* Curated Real Photographs */}
          <AnimatedSection
            delay={0.08}
            once
            className="grid gap-6 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1"
          >
            <div className="overflow-hidden rounded-[18px] bg-[#0A2619] shadow-xl ring-1 ring-white/10">
              <img
                src={highlightImage1}
                alt="AIAIAC plenary assembly and delegates seated during technical sessions"
                width="800"
                height="500"
                loading="lazy"
                decoding="async"
                className="h-[200px] w-full object-cover sm:h-[220px] lg:h-[235px]"
              />
            </div>
            <div className="overflow-hidden rounded-[18px] bg-[#0A2619] shadow-xl ring-1 ring-white/10">
              <img
                src={highlightImage2}
                alt="AIAIAC delegates and technology providers in discussion at exhibition booth"
                width="800"
                height="500"
                loading="lazy"
                decoding="async"
                className="h-[200px] w-full object-cover sm:h-[220px] lg:h-[235px]"
              />
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
