import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { conference } from "@/data/conference";
import { heroSlides } from "@/data/media";
import { keynotes } from "@/data/speakers";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { ActionLink } from "@/components/common/ActionButton";
import { HeroCountdown } from "./Countdown";

const SLIDE_MS = 6500;
const ease = [0.16, 1, 0.3, 1] as const;
const stageClip =
  "polygon(2.6rem 0, calc(100% - 5rem) 0, 100% 3.25rem, 100% calc(100% - 4rem), calc(100% - 4rem) 100%, 1.25rem 100%, 0 calc(100% - 1.25rem), 0 2.6rem)";

export function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();

  const go = useCallback((next: number) => {
    setIndex((next + heroSlides.length) % heroSlides.length);
  }, []);

  useEffect(() => {
    if (paused || reduced) return;
    const id = window.setTimeout(() => go(index + 1), SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, reduced, go]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(index + 1);
      if (event.key === "ArrowLeft") go(index - 1);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  const slide = heroSlides[index] ?? heroSlides[0]!;
  const keynote = keynotes[0]!;

  return (
    <section
      className="relative isolate overflow-hidden bg-mineral pb-8 pt-20 text-white lg:pb-8 lg:pt-24"
      aria-label="AIAC West Africa 2026 introduction"
    >
      <div
        className="grid-lines pointer-events-none absolute inset-0 -z-10 opacity-20"
        aria-hidden
      />
      <img
        src="/brand/aiaiac_logo.png"
        alt=""
        aria-hidden
        className="technical-seal -bottom-44 -left-24 hidden invert lg:block"
      />

      <div className="shell">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7, ease }}
          className="flex min-h-14 items-end justify-between gap-6 border-b border-white/12 py-2 uppercase"
        >
          <div className="space-y-1">
            <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-white sm:text-xs">
              {conference.datesShort}
            </p>
            <p className="text-[0.58rem] tracking-[0.08em] text-white/60 sm:text-[0.68rem]">
              {conference.venue}
            </p>
          </div>
          <p className="max-w-[15rem] text-right text-[0.58rem] font-semibold tracking-[0.14em] text-white/60 sm:text-[0.66rem]">
            {conference.title}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.95, ease }}
          className="relative mt-4 bg-emerald/55 p-px lg:mt-5"
          style={{ clipPath: stageClip }}
        >
          <div
            className="relative min-h-[35rem] overflow-hidden bg-navy-900 sm:min-h-[38rem] lg:min-h-[40rem]"
            style={{ clipPath: stageClip }}
          >
            <AnimatePresence initial={false}>
              <motion.div
                key={slide.id}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: reduced ? 1 : 1.06 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  transition: {
                    opacity: { duration: 1.1, ease },
                    scale: { duration: 9, ease: "linear" },
                  },
                }}
                exit={{ opacity: 0, transition: { duration: 0.9, ease } }}
              >
                <img
                  src={slide.src}
                  alt={slide.caption}
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "low"}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-0 bg-mineral/45" />
            <div className="absolute inset-0 bg-gradient-to-t from-mineral via-mineral/30 to-mineral/70" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.195_0.035_158/.84),transparent_64%)]" />
            <div className="grid-lines absolute inset-0 opacity-30" aria-hidden />

            <div className="relative flex min-h-[35rem] flex-col px-5 py-5 sm:min-h-[38rem] sm:px-8 sm:py-7 lg:min-h-[40rem] lg:px-12 lg:py-8 xl:px-16">
              <EventDate />

              <div className="absolute right-6 top-8 hidden lg:block xl:right-10">
                <HeroCountdown />
              </div>

              <div className="mt-auto max-w-[48rem] pb-2 pt-20 sm:pb-5 lg:max-w-[55%] lg:pb-4 lg:pt-48 xl:max-w-[58%]">
                <h1>
                  <span className="sr-only">
                    AIAIAC — {conference.title}, {conference.dates}, {conference.venue}
                  </span>
                  <motion.img
                    aria-hidden
                    src="/brand/aiaiac_logo.png"
                    alt=""
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55, duration: 0.9, ease }}
                    className="mb-4 block h-24 w-full max-w-[34rem] object-contain object-left mix-blend-screen sm:mb-5 sm:h-28 lg:h-32"
                  />
                  <motion.span
                    aria-hidden
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.68, duration: 0.9, ease }}
                    className="block font-display text-[clamp(1.75rem,6vw,3.7rem)] font-bold uppercase leading-[0.9] tracking-[-0.025em] text-white lg:text-[clamp(2.6rem,3.6vw,4.35rem)]"
                  >
                    Asset Integrity
                    <span className="block text-emerald">Artificial Intelligence</span>
                    <span className="block text-white">Automation · Cybersecurity</span>
                  </motion.span>
                </h1>

                <motion.p
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.86, duration: 0.8, ease }}
                  className="mt-6 max-w-2xl border-l-2 border-emerald pl-4 text-xs font-semibold uppercase leading-relaxed tracking-[0.12em] text-white/78"
                >
                  {conference.strapline}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.96, duration: 0.75, ease }}
                  className="mt-5"
                >
                  <ActionLink to="/register" size="sm">
                    Register Now
                  </ActionLink>
                </motion.div>
              </div>

              <div className="mt-5 lg:hidden">
                <HeroCountdown />
              </div>

              <motion.div
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9, duration: 0.9, ease }}
                className="absolute bottom-12 right-0 hidden w-[40%] max-w-[35rem] lg:block"
              >
                <KeynoteCredential keynote={keynote} />
              </motion.div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.85, ease }}
          className="mt-4 hidden sm:block lg:hidden"
        >
          <KeynoteCredential keynote={keynote} />
        </motion.div>

        <ParticipationRail
          index={index}
          paused={paused}
          reduced={reduced}
          slideLabel={slide.label}
          onGo={go}
          onTogglePause={() => setPaused((value) => !value)}
        />
      </div>
    </section>
  );
}

function EventDate() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.48, duration: 0.8, ease }}
      className="mx-auto w-full max-w-[27rem] text-center lg:absolute lg:left-1/2 lg:top-8 lg:-translate-x-1/2"
    >
      <p className="border border-emerald/60 bg-navy-900/65 px-4 py-2 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-emerald backdrop-blur-sm sm:text-[0.68rem]">
        {conference.venue}
      </p>
      <div className="mt-4 flex items-center justify-center gap-4 sm:gap-6">
        <span className="numeral text-5xl leading-none text-white sm:text-6xl">09</span>
        <span className="h-px w-10 bg-emerald sm:w-14" aria-hidden />
        <span className="numeral text-5xl leading-none text-white sm:text-6xl">10</span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/25" aria-hidden />
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.36em] text-emerald sm:text-sm">
          June
        </p>
        <span className="h-px flex-1 bg-white/25" aria-hidden />
      </div>
      <p className="mt-1 font-mono text-sm font-semibold tracking-[0.42em] text-white/75">2026</p>
    </motion.div>
  );
}

function KeynoteCredential({ keynote }: { keynote: (typeof keynotes)[number] }) {
  return (
    <article className="relative overflow-hidden border border-emerald/55 bg-forest text-white shadow-[0_24px_70px_oklch(0.12_0.03_157/.45)]">
      <div className="absolute inset-y-0 left-0 w-1 bg-emerald" aria-hidden />
      <div className="grid min-h-[15rem] grid-cols-[1.1fr_.9fr] lg:min-h-[16.5rem]">
        <div className="relative z-10 flex flex-col p-5 pl-6 sm:p-7 sm:pl-8">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-emerald" aria-hidden />
            <p className="font-mono text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-emerald sm:text-[0.66rem]">
              Featured keynote
            </p>
          </div>
          <h2 className="mt-5 font-display text-2xl font-extrabold uppercase leading-none tracking-[-0.04em] sm:text-3xl">
            {keynote.name}
          </h2>
          <p className="mt-4 text-sm font-semibold text-white/82">{keynote.role}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/58 sm:text-sm">
            {keynote.organisation}
          </p>
          <p className="mt-auto pt-5 font-mono text-[0.56rem] uppercase tracking-[0.2em] text-white/40">
            AIAC West Africa · 2026
          </p>
        </div>
        <div className="relative min-h-[15rem] overflow-hidden lg:min-h-[16.5rem]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,oklch(0.6409_0.1445_158.24/.16)_100%)]" />
          <img
            src={keynote.image}
            alt={`Portrait of ${keynote.name}`}
            loading="eager"
            decoding="async"
            className="absolute inset-x-0 bottom-0 h-[95%] w-full object-contain object-bottom"
          />
          <span className="absolute bottom-5 right-4 font-mono text-[0.5rem] uppercase tracking-[0.24em] text-white/35 [writing-mode:vertical-rl]">
            Keynote credential
          </span>
        </div>
      </div>
    </article>
  );
}

function ParticipationRail({
  index,
  paused,
  reduced,
  slideLabel,
  onGo,
  onTogglePause,
}: {
  index: number;
  paused: boolean;
  reduced: boolean;
  slideLabel: string;
  onGo: (next: number) => void;
  onTogglePause: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.15, duration: 0.8 }}
      className="mt-5 border-t border-white/14 pt-5"
    >
      <div className="grid gap-5 lg:grid-cols-[auto_minmax(18rem,1fr)_auto] lg:items-end lg:gap-10">
        <div className="hidden sm:block">
          <p className="font-display text-base font-bold uppercase tracking-[0.01em] text-emerald sm:text-lg">
            Get ready to participate in AIAIAC 2026
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ActionLink to="/register" size="sm" className="w-full sm:w-auto">
              Register Now
            </ActionLink>
            <ActionLink
              href="#about"
              variant="outline"
              size="sm"
              className="w-full text-white sm:w-auto"
            >
              Explore Conference
            </ActionLink>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-4 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-white/48">
            <span>{slideLabel}</span>
            <span className="numeral text-xs text-white/80">
              {String(index + 1).padStart(2, "0")}
              <span className="text-white/35"> / {String(heroSlides.length).padStart(2, "0")}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {heroSlides.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onGo(itemIndex)}
                aria-label={`Show slide ${itemIndex + 1}: ${item.label}`}
                aria-current={itemIndex === index}
                className="group relative min-h-11 flex-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald"
              >
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/20 transition-colors group-hover:bg-white/45" />
                {itemIndex === index && (
                  <motion.span
                    key={`${item.id}-${index}-${paused}`}
                    className="absolute inset-x-0 top-1/2 h-[2px] origin-left -translate-y-1/2 bg-emerald"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      duration: paused || reduced ? 0 : SLIDE_MS / 1000,
                      ease: "linear",
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <SlideButton onClick={() => onGo(index - 1)} label="Previous slide">
            ←
          </SlideButton>
          <SlideButton
            onClick={onTogglePause}
            label={paused ? "Play slideshow" : "Pause slideshow"}
          >
            {paused ? "▶" : "❚❚"}
          </SlideButton>
          <SlideButton onClick={() => onGo(index + 1)} label="Next slide">
            →
          </SlideButton>
        </div>
      </div>
    </motion.div>
  );
}

function SlideButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center border border-white/22 font-mono text-xs text-white/80",
        "transition-colors duration-300 hover:border-emerald hover:text-emerald focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald",
      )}
    >
      {children}
    </button>
  );
}
