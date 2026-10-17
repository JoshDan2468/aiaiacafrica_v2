import { conference } from "@/data/conference";
import { pillars } from "@/data/media";
import { Reveal, RevealText } from "@/components/common/Reveal";

export function About() {
  return (
    <section id="about" className="relative overflow-hidden bg-background py-24 lg:py-36">
      <img
        src="/brand/aiaiac-emblem.png"
        alt=""
        aria-hidden
        loading="lazy"
        className="technical-seal -right-28 top-12 hidden lg:block"
      />
      <div className="shell">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="eyebrow text-emerald-deep">The Conference</p>
            </Reveal>
            <h2 className="display-lg mt-6 text-navy">
              <RevealText text="Guarding infrastructure," />
              <br />
              <RevealText text="powering innovation," delay={0.1} />
              <br />
              <span className="text-emerald-deep">
                <RevealText text="securing tomorrow." delay={0.2} />
              </span>
            </h2>
            <Reveal delay={0.15} className="mt-10 border-l-2 border-emerald pl-6">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
                {conference.dates}
              </p>
              <p className="mt-2 font-display text-lg font-bold text-navy">{conference.venue}</p>
            </Reveal>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            {conference.overview.map((p, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <p className="mb-6 text-base leading-relaxed text-muted-foreground lg:text-lg">
                  {p}
                </p>
              </Reveal>
            ))}
            <Reveal delay={0.25}>
              <div className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-2">
                {conference.conferences.map((c) => (
                  <div key={c.id} className="bg-background p-6">
                    <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-emerald-deep">
                      {c.hall}
                    </p>
                    <p className="mt-3 font-display text-xl font-bold leading-tight text-navy">
                      {c.name}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      <PillarRail />
    </section>
  );
}

function PillarRail() {
  return (
    <div className="shell mt-24 lg:mt-32">
      <div className="datum-line mb-8" aria-hidden />
      <div className="grid border-y border-border sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((p) => (
          <article
            key={p.index}
            className="group relative min-h-[25rem] overflow-hidden border-border bg-mineral sm:border-r lg:min-h-[34rem]"
          >
            <img
              src={p.image}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-42 grayscale transition-[transform,filter,opacity] duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:opacity-60 group-hover:grayscale-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/40 to-transparent" />
            <div className="relative flex min-h-[25rem] flex-col justify-between p-7 lg:min-h-[34rem]">
              <div className="flex items-center gap-4">
                <span className="numeral text-sm text-emerald">{p.index}</span>
                <span className="h-px flex-1 bg-white/24" aria-hidden />
              </div>
              <div>
                <h3 className="display-md text-white">{p.title}</h3>
                <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
                  {p.description}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
