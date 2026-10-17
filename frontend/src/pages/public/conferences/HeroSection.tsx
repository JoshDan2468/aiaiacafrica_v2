import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import heroPoster from "@/data/AIAC_images/image4.jpg";

export function HeroSection() {
  const reducedMotion = useReducedMotion();

  return (
    <header className="relative flex min-h-[640px] w-full items-center overflow-hidden bg-[#05190F] pb-24 pt-36 text-[#F7F5EF] sm:min-h-[680px] sm:pb-28 sm:pt-40 lg:min-h-[740px] lg:pb-32 lg:pt-48">
      {/* Immersive Video / Poster Background with Translucent Green Overlay */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {reducedMotion ? (
          <img
            src="/assets/aiaiac-2027/video-posters/hero-poster.webp"
            alt="AIAIAC Africa conference atmosphere"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = heroPoster;
            }}
          />
        ) : (
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/assets/aiaiac-2027/video-posters/hero-poster.webp"
            className="h-full w-full object-cover opacity-85"
          >
            <source src="/assets/aiaiac-2027/videos/aiaiac-hero.mp4" type="video/mp4" />
          </video>
        )}
        {/* Controlled rgba overlay so video motion is clearly visible behind text */}
        <div className="absolute inset-0 bg-[#05190F]/70" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <AnimatedSection className="max-w-4xl">
          <h1 className="font-display text-[40px] font-extrabold uppercase leading-[1.02] tracking-tight text-[#F7F5EF] sm:text-[54px] lg:text-[66px] xl:text-[74px]">
            AIAIAC Africa 2027 <br className="hidden sm:inline" />
            Conferences
          </h1>
          <p className="mt-6 max-w-[620px] text-base leading-[1.62] text-[#BBC7BF] sm:text-[17.5px] lg:text-[18px]">
            The conference programme brings together technical discussions across asset integrity,
            artificial intelligence, automation and cybersecurity.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-base font-medium text-[#F7F5EF] sm:text-[18px]">
            <span>22–23 June 2027</span>
            <span className="text-[#CFEA3B]" aria-hidden="true">
              •
            </span>
            <span>Lagos, Nigeria</span>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-4 sm:mt-11">
            <Link
              to="/registration/abstract"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[#CFEA3B] px-8 text-base font-semibold text-[#102C20] transition-colors hover:bg-[#b8d62c]"
            >
              <span>Submit an Abstract</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              to="/registration"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-[#173D2D] px-8 text-base font-semibold text-[#F7F5EF] transition-colors hover:bg-[#1f4f3b]"
            >
              <span>Register Interest</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </header>
  );
}
