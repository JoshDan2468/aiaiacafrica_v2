import { motion } from "motion/react";
import { useState } from "react";
import { programme } from "@/data/programme";
import { conference } from "@/data/conference";
import { pillars } from "@/data/media";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/common/Reveal";

export function Programme() {
  const [active, setActive] = useState(programme[0]!.id);
  const day = programme.find((d) => d.id === active) ?? programme[0]!;

  return (
    <section id="programme" className="bg-background py-24 lg:py-32">
      <div className="shell">
        <Reveal>
          <p className="eyebrow text-emerald-deep">Provisional Programme</p>
          <h2 className="display-lg mt-6 max-w-3xl text-navy">Two days, two halls</h2>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          {conference.conferences.map((track, index) => {
            const image = pillars[index === 0 ? 0 : 3]!.image;
            return (
              <Reveal key={track.id} delay={index * 0.1}>
                <article className="image-cut group relative min-h-[22rem] overflow-hidden bg-mineral sm:min-h-[27rem]">
                  <img
                    src={image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover opacity-50 grayscale transition-[transform,filter] duration-[1.2s] group-hover:scale-105 group-hover:grayscale-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-mineral via-mineral/35 to-transparent" />
                  <div className="relative flex min-h-[22rem] flex-col justify-between p-8 sm:min-h-[27rem] sm:p-10">
                    <div className="flex items-center gap-4">
                      <span className="numeral text-sm text-emerald">0{index + 1}</span>
                      <span className="h-px flex-1 bg-white/25" aria-hidden />
                      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/55">
                        {track.hall}
                      </span>
                    </div>
                    <h3 className="display-md max-w-md text-white">{track.name}</h3>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex gap-3 lg:flex-col">
              {programme.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setActive(d.id)}
                  aria-pressed={active === d.id}
                  className={cn(
                    "flex-1 border p-6 text-left transition-colors duration-400",
                    active === d.id
                      ? "border-navy bg-navy text-white"
                      : "border-border text-navy hover:border-navy",
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-[0.62rem] uppercase tracking-[0.24em]",
                      active === d.id ? "text-emerald" : "text-muted-foreground",
                    )}
                  >
                    {d.date}
                  </span>
                  <span className="mt-3 block font-display text-2xl font-extrabold uppercase">
                    {d.label}
                  </span>
                </button>
              ))}
            </div>
            <Reveal delay={0.1}>
              <p className="mt-8 text-sm leading-relaxed text-muted-foreground">{day.summary}</p>
              <p className="mt-6 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-emerald-deep">
                Agenda subject to confirmation
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-8">
            <motion.ul
              key={day.id}
              initial="hidden"
              animate="show"
              className="border-t border-border"
            >
              {day.sessions.map((s, i) => (
                <motion.li
                  key={`${s.time}-${s.title}-${i}`}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="group grid grid-cols-[auto_1fr] items-start gap-6 border-b border-border py-6 transition-colors duration-300 hover:bg-muted/60 sm:grid-cols-[7rem_1fr_auto] sm:gap-8"
                >
                  <span className="numeral text-lg text-emerald-deep">{s.time}</span>
                  <div>
                    <h3 className="font-display text-lg font-bold leading-snug text-navy">
                      {s.title}
                    </h3>
                    {s.detail && <p className="mt-2 text-sm text-muted-foreground">{s.detail}</p>}
                  </div>
                  {s.hall && (
                    <span className="col-start-2 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground sm:col-start-3 sm:text-right">
                      {s.hall}
                    </span>
                  )}
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </div>
      </div>
    </section>
  );
}
