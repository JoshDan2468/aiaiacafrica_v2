import { motion } from "motion/react";
import { ActionLink } from "@/components/common/ActionButton";
import { CompanyLogoBadge } from "@/components/common/CompanyLogoBadge";
import { CountryBadge } from "@/components/common/CountryFlag";
import { FlipCard } from "@/components/common/FlipCard";
// @ts-expect-error The requested React Bits registry component is distributed as JSX.
import RotatingText from "@/components/RotatingText";
import { conference, eventSchedule } from "@/data/conference";
import { homeVideoMedia } from "@/data/media";
import { heroKeynoteSpeaker } from "@/data/speakers";
import { useCountdown } from "@/hooks/useCountdown";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const heroBackgroundVideo = homeVideoMedia.hero.videoSrc;
const heroBackgroundPoster = homeVideoMedia.hero.posterSrc;

const countdownUnits = [
  { key: "days", label: "Days", minimumDigits: 3 },
  { key: "hours", label: "Hours", minimumDigits: 2 },
  { key: "minutes", label: "Minutes", minimumDigits: 2 },
  { key: "seconds", label: "Seconds", minimumDigits: 2 },
] as const;

function formatCountdownValue(value: number | undefined, minimumDigits: number) {
  return value === undefined ? "--" : String(value).padStart(minimumDigits, "0");
}

/** Compact Event Date Card (Sitting at top of Right Column) */
function EventDateCard() {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reducedMotion ? { duration: 0 } : { duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }
      }
      className="relative isolate flex w-full flex-col items-center justify-center rounded-2xl bg-[#05190f]/45 p-5 text-center text-white backdrop-blur-md"
    >
      <div className="inline-flex items-center gap-1.5 rounded-full bg-lime/15 px-3.5 py-1 text-xs font-bold text-lime">
        <span>📍</span>
        <span>{eventSchedule.location}</span>
      </div>

      <div className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        22 <span className="font-sans text-lime/80">—</span> 23
      </div>

      <div className="mt-0.5 font-display text-lg font-bold tracking-wide text-white/90">June</div>

      <div className="font-mono text-xs font-semibold tracking-widest text-lime">2027</div>
    </motion.div>
  );
}

/** Compact 4-Tile Countdown (Sits directly underneath CTA buttons on Left Column) */
function CountdownCard() {
  const countdown = useCountdown(conference.countdown.targetISO);

  return (
    <div className="relative isolate max-w-xl rounded-2xl bg-[#05190f]/45 p-4 sm:p-5 backdrop-blur-md">
      <p className="font-display text-xs font-semibold tracking-wide text-white/90">
        Get ready for AIAIAC Africa 2027
      </p>

      <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2.5">
        {countdownUnits.map((unit) => {
          const rawValue = countdown?.[unit.key];
          const formattedValue = formatCountdownValue(rawValue, unit.minimumDigits);
          return <FlipCard key={unit.key} value={formattedValue} label={unit.label} />;
        })}
      </div>
    </div>
  );
}

/** Large Hero Keynote Speaker Feature Card (Dominant Visual on Right Side) */
function KeynoteSpeakerCard() {
  return (
    <div className="group relative isolate w-full">
      {/* Restrained Lime/Forest Backplate Shift */}
      <div
        className="absolute inset-0 rounded-[1.75rem] bg-forest/40 opacity-80 transition-all duration-400 ease-out group-hover:translate-x-3.5 group-hover:-translate-y-3 group-hover:bg-lime group-hover:opacity-100 group-focus-within:translate-x-3.5 group-focus-within:-translate-y-3 group-focus-within:bg-lime group-focus-within:opacity-100"
        aria-hidden
      />

      {/* Main Rich Dark AIAIAC Gradient Surface */}
      <div className="relative z-10 flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-white/14 bg-gradient-to-br from-[#071F18] via-[#0C3828] to-[#18533B] p-5 sm:p-6 text-white shadow-2xl transition-transform duration-400 ease-out group-hover:-translate-y-1 group-focus-within:-translate-y-1 sm:flex-row sm:items-end">
        {/* Left Column (Approx 50% Width): Speaker Info & AGPC Logo Tile */}
        <div className="flex min-w-0 flex-1 flex-col justify-between space-y-4 pr-2 pb-1 sm:pb-0 z-10 sm:max-w-[50%] lg:max-w-[48%]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-block rounded-md bg-lime/15 px-3 py-1 font-sans text-xs font-semibold text-lime">
                Keynote Speaker
              </span>
              <CountryBadge code={heroKeynoteSpeaker.countryCode || "NG"} />
            </div>
            <h3 className="mt-3 font-display text-xl font-extrabold leading-tight text-white sm:text-2xl lg:text-2xl">
              {heroKeynoteSpeaker.name}
            </h3>
            <p className="mt-1 font-sans text-xs font-medium text-white/80">
              {heroKeynoteSpeaker.role}
            </p>
            <p className="mt-0.5 font-sans text-xs text-white/60">
              {heroKeynoteSpeaker.organisation}
            </p>
          </div>

          {/* Keynote Organisation Badge & Name */}
          <div className="flex items-center gap-3 pt-1">
            <CompanyLogoBadge
              organisationKey={heroKeynoteSpeaker.organisationKey || "anoh"}
              organisationName={heroKeynoteSpeaker.organisation}
            />
            <span className="font-sans text-xs font-medium text-white/75">
              {heroKeynoteSpeaker.organisation}
            </span>
          </div>
        </div>

        {/* Right Column (Approx 48-52% Width & Full Usable Height): Prominent Keynote Executive Portrait */}
        <div className="relative mt-4 flex shrink-0 items-end justify-end pointer-events-none h-64 w-full sm:absolute sm:right-0 sm:bottom-0 sm:top-0 sm:mt-0 sm:h-full sm:w-[50%] lg:w-[52%]">
          <img
            src={heroKeynoteSpeaker.image}
            alt={`Portrait of ${heroKeynoteSpeaker.name}`}
            className="h-full w-full object-contain object-bottom transition-transform duration-500 scale-[1.08] group-hover:scale-[1.14] origin-bottom-right"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  const reducedMotion = useReducedMotion();
  const rotatingHeadlines = ["Conference", "Innovation Showcase"];

  return (
    <section className="on-navy relative isolate min-h-120 overflow-hidden bg-[#05190F] pb-16 pt-28 lg:min-h-120 lg:pb-20 lg:pt-36">
      {/* LAYER 1: Background Video with Poster Fallback */}
      {heroBackgroundVideo && !reducedMotion ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          src={heroBackgroundVideo}
          poster={heroBackgroundPoster}
          className="absolute inset-0 z-0 h-full w-full object-cover object-center opacity-75"
        >
          <source src={heroBackgroundVideo} type="video/mp4" />
        </video>
      ) : (
        <img
          src={heroBackgroundPoster}
          alt={homeVideoMedia.hero.posterAlt}
          className="absolute inset-0 z-0 h-full w-full object-cover object-center opacity-75"
          loading="eager"
          decoding="async"
        />
      )}

      {/* LAYER 2: Tonal Dark AIAIAC Green Readability Overlay (60–75% Opacity Gradient) */}
      <div
        className="absolute inset-0 z-10 bg-gradient-to-r from-[#05190F]/90 via-[#05190F]/70 to-[#05190F]/55 pointer-events-none"
        aria-hidden="true"
      />

      {/* LAYER 3: Hero Content Shell */}
      <div className="shell relative z-20 flex flex-col justify-between">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,27rem)] lg:gap-14">
          {/* Main Hero Left Content (~55-60% width) */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }
            }
            className="min-w-0"
          >
            <h1 className="home-hero-title text-white">
              <span className="home-hero-pillars block max-w-xl font-sans text-lg font-semibold text-white/90 sm:text-xl">
                Asset Integrity, Artificial Intelligence,{" "}
                <span className="whitespace-nowrap">Automation &amp; Cybersecurity</span>
              </span>
              <span className="home-hero-conference block mt-3 font-display text-lime font-extrabold leading-[0.92] tracking-tight">
                {reducedMotion ? (
                  "Conference & Innovation Showcase"
                ) : (
                  <RotatingText
                    texts={rotatingHeadlines}
                    transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
                    initial={{ y: "105%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-105%", opacity: 0 }}
                    animatePresenceMode="wait"
                    rotationInterval={3200}
                    splitBy="words"
                    staggerDuration={0}
                    mainClassName="home-hero-rotating-text"
                  />
                )}
              </span>
            </h1>

            <p className="mt-6 max-w-lg border-l-2 border-lime pl-5 text-base leading-relaxed text-white/75 sm:text-md">
              Securing Assets, Empowering Intelligence. Automating the Future.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row flex-wrap gap-3 sm:mt-8">
              <ActionLink to="/registration" size="lg" className="w-full text-center sm:w-auto">
                Registration Options
              </ActionLink>
              <ActionLink
                to="/about"
                variant="outline"
                size="lg"
                className="w-full text-center text-white sm:w-auto"
              >
                Explore AIAIAC
              </ActionLink>
            </div>

            {/* DIRECTLY UNDERNEATH CTAs: Countdown ONLY (28px spacing) */}
            <div className="mt-7 sm:mt-8">
              <CountdownCard />
            </div>
          </motion.div>

          {/* Right Side (~40-45% width): TOP = Date/Location Card, BELOW = Keynote Speaker Card */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 0.85, delay: 0.35, ease: [0.16, 1, 0.3, 1] }
            }
            className="flex flex-col gap-6 sm:gap-8"
          >
            <EventDateCard />
            <KeynoteSpeakerCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
