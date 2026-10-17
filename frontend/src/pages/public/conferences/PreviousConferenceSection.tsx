import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import previewPoster from "@/data/AIAC_images/image16.jpg";

export function PreviousConferenceSection() {
  return (
    <section className="bg-[#E8EEE8] py-28 text-[#102C20] sm:py-32 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-14 xl:gap-18">
          {/* Left Column: Heading + Factual Perspective + Action (~42% width) */}
          <AnimatedSection className="lg:col-span-5">
            <h2 className="font-display text-[32px] font-extrabold uppercase tracking-tight text-[#102C20] sm:text-[38px] lg:text-[42px]">
              Previous Conference
            </h2>
            <p className="mt-5 text-base leading-[1.68] text-[#4A5850] sm:text-[16.5px] lg:text-[17px]">
              The inaugural edition convened senior operational executives, inspection authorities,
              and industrial technology developers across two days of technical papers, executive
              panels, and hands-on system demonstrations.
            </p>
            <div className="mt-6 space-y-2.5 text-[15px] leading-[1.6] text-[#2D5443] sm:text-[16px]">
              <p>• Dual-track technical programme across asset integrity and cybersecurity</p>
              <p>
                • Executive participation from regional ministries, NOCs, and international
                operators
              </p>
              <p>
                • Practical demonstrations of autonomous inspection tools and operational technology
              </p>
            </div>
            <div className="mt-9">
              <Link
                to="/media"
                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[14px] border border-[#102C20]/25 bg-transparent px-8 text-base font-semibold text-[#102C20] transition-colors hover:bg-[#102C20]/5"
              >
                <span>View Conference Media & Highlights</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </AnimatedSection>

          {/* Right Column: Major 16:9 Video Player (~58% width, NO badge, NO caption strip) */}
          <AnimatedSection delay={0.08} className="lg:col-span-7">
            <div className="overflow-hidden rounded-[10px] bg-[#071C13] shadow-2xl sm:rounded-[12px]">
              <video
                controls
                playsInline
                preload="metadata"
                poster="/assets/aiaiac-2027/video-posters/previous-conference-poster.webp"
                className="aspect-16/9 w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLVideoElement).poster = previewPoster;
                }}
              >
                <source
                  src="/assets/aiaiac-2027/videos/aiaiac-previous-conference.mp4"
                  type="video/mp4"
                />
                Your browser does not support HTML5 video.
              </video>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
