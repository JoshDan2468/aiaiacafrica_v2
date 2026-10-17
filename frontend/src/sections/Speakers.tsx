import { motion } from "motion/react";
import { useState } from "react";
import { keynotes, speakers } from "@/data/speakers";
import type { Speaker, Track } from "@/types";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/common/Reveal";

const tracks: { id: Track | "all"; label: string }[] = [
  { id: "all", label: "All Speakers" },
  { id: "asset-integrity", label: "Asset Integrity" },
  { id: "automation-cybersecurity", label: "Automation & Cybersecurity" },
];

export function Speakers() {
  const [track, setTrack] = useState<Track | "all">("all");
  const list = track === "all" ? speakers : speakers.filter((s) => s.track === track);

  return (
    <section id="speakers" className="bg-background py-24 lg:py-32">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <Reveal>
            <p className="eyebrow text-emerald-deep">Voices of the industry</p>
            <h2 className="display-lg mt-6 max-w-2xl text-navy">Keynote & featured speakers</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Operators, EPCs, regulators and technology leaders shaping asset integrity, automation
              and OT cybersecurity across West Africa.
            </p>
          </Reveal>
        </div>

        {/* Keynotes */}
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:gap-10">
          {keynotes.map((k, i) => (
            <Reveal key={k.id} delay={i * 0.1}>
              <article className="group image-cut relative min-h-[32rem] overflow-hidden bg-mineral text-white sm:min-h-[38rem]">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,oklch(0.455_0.135_148/.75),transparent_58%)]" />
                <div className="absolute inset-y-0 right-0 w-[72%] overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,oklch(0.875_0.17_116/.16),transparent_38%)]" />
                  <img
                    src={k.image}
                    alt={`Portrait of ${k.name}`}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-x-0 bottom-0 h-[92%] w-full object-contain object-bottom grayscale transition-[filter,transform] duration-700 group-hover:scale-[1.025] group-hover:grayscale-0"
                  />
                </div>
                <div className="relative z-10 flex min-h-[32rem] max-w-[70%] flex-col justify-between p-8 sm:min-h-[38rem] sm:p-10">
                  <p className="eyebrow text-emerald">Keynote Speaker · 0{i + 1}</p>
                  <div>
                    <h3 className="display-md max-w-sm text-white">{k.name}</h3>
                    <div className="mt-5 h-px w-16 bg-emerald" aria-hidden />
                    <p className="mt-5 text-sm font-semibold text-white">{k.role}</p>
                    <p className="mt-1 max-w-[16rem] text-sm leading-relaxed text-white/62">
                      {k.organisation}
                    </p>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {/* Filters */}
        <div className="mt-20 flex flex-wrap items-center gap-3 border-b border-border pb-6">
          {tracks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTrack(t.id)}
              aria-pressed={track === t.id}
              className={cn(
                "min-h-11 border px-5 py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] transition-colors duration-300",
                track === t.id
                  ? "border-navy bg-navy text-white"
                  : "border-border text-muted-foreground hover:border-navy hover:text-navy",
              )}
            >
              {t.label}
            </button>
          ))}
          <span className="ml-auto numeral text-sm text-muted-foreground">
            {String(list.length).padStart(2, "0")}
          </span>
        </div>

        <motion.ul
          layout
          className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4"
        >
          {list.map((s, i) => (
            <SpeakerCard key={s.id} speaker={s} index={i} />
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

function SpeakerCard({ speaker, index }: { speaker: Speaker; index: number }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.7, delay: (index % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <div className="image-cut relative aspect-[4/5] overflow-hidden bg-muted">
        <img
          src={speaker.image}
          alt={speaker.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-top grayscale transition-[filter,transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] group-hover:grayscale-0"
        />
        <span className="absolute bottom-0 left-0 h-[3px] w-0 bg-emerald transition-[width] duration-700 group-hover:w-full" />
      </div>
      <h3 className="mt-5 font-display text-base font-bold leading-tight text-navy">
        {speaker.name}
      </h3>
      <p className="mt-2 text-sm text-emerald-deep">{speaker.role}</p>
      <p className="text-sm text-muted-foreground">{speaker.organisation}</p>
    </motion.li>
  );
}
