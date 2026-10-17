import { conference } from "@/data/conference";
import { ActionLink } from "@/components/common/ActionButton";
import { Reveal } from "@/components/common/Reveal";
import { exhibitionImage } from "@/data/media";
import { registrationOptions } from "@/data/registration";
import { organiserLogo, sponsors, sponsorTiers } from "@/data/sponsors";

export function Stats() {
  return (
    <section className="border-y border-forest/20 bg-forest py-14 text-white">
      <dl className="shell grid grid-cols-2 gap-10 divide-white/14 lg:grid-cols-4 lg:divide-x">
        {conference.stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.07}>
            <div className="lg:px-7 lg:first:pl-0">
              <dd className="numeral text-5xl text-white lg:text-6xl">{s.value}</dd>
              <dt className="mt-3 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/58">
                {s.label}
              </dt>
            </div>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}

export function Exhibition() {
  return (
    <section id="exhibition" className="relative bg-background py-24 lg:py-32">
      <div className="shell grid gap-14 lg:grid-cols-12 lg:items-center">
        <Reveal className="lg:col-span-6">
          <div className="image-cut group relative aspect-[4/3] overflow-hidden bg-mineral">
            <img
              src={exhibitionImage}
              alt="AIAC West Africa exhibition hall"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-mineral/45 via-transparent to-forest/10" />
            <p className="absolute bottom-6 left-6 border-l-2 border-emerald pl-4 text-xs font-semibold uppercase tracking-[0.12em] text-white">
              Technology · Connection · Opportunity
            </p>
          </div>
        </Reveal>
        <div className="lg:col-span-5 lg:col-start-8">
          <Reveal>
            <p className="eyebrow text-emerald-deep">Participate</p>
            <h2 className="display-lg mt-6 text-navy">Join the floor</h2>
          </Reveal>
          <ul className="mt-10 space-y-px bg-border">
            {registrationOptions.map((o, i) => (
              <Reveal as="li" key={o.id} delay={i * 0.08}>
                <div className="bg-background py-7">
                  <h3 className="font-display text-xl font-bold text-navy">{o.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {o.description}
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
                    {o.benefits.map((b) => (
                      <li
                        key={b}
                        className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-emerald-deep"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                  <ActionLink
                    to="/register"
                    variant="ghost"
                    size="sm"
                    className="mt-4 px-0 text-navy"
                  >
                    {o.cta} →
                  </ActionLink>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Sponsors() {
  return (
    <section id="sponsors" className="bg-muted py-24 lg:py-32">
      <div className="shell">
        <Reveal>
          <p className="eyebrow text-emerald-deep">Partners & Sponsors</p>
          <h2 className="display-lg mt-6 text-navy">Backed by the industry</h2>
        </Reveal>

        <div className="mt-16 space-y-16">
          {sponsorTiers.map((tier) => {
            const list = sponsors.filter((s) => s.tier === tier.id);
            if (!list.length) return null;
            return (
              <Reveal key={tier.id}>
                <div className="flex items-center gap-5">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {tier.label}
                  </p>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                </div>
                <ul className="mt-8 grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
                  {list.map((s) => (
                    <li
                      key={s.id}
                      className="flex min-h-24 items-center justify-center border-b border-border bg-white/45 p-4"
                    >
                      <img
                        src={s.logo}
                        alt={s.name ?? `${tier.label} logo`}
                        loading="lazy"
                        decoding="async"
                        className="max-h-14 w-auto max-w-full object-contain opacity-90 grayscale-[.35] contrast-125 transition-[filter,opacity,transform] duration-500 hover:-translate-y-1 hover:opacity-100 hover:grayscale-0"
                      />
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-16 flex flex-wrap items-center gap-6 border-t border-border pt-10">
            <img
              src={organiserLogo}
              alt="Aldrich Energy"
              loading="lazy"
              className="h-12 w-auto object-contain"
            />
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {conference.contact.organiserBlurb}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Conversion() {
  return (
    <section className="relative overflow-hidden bg-forest py-20 text-white lg:py-28">
      <div className="grid-lines absolute inset-0 opacity-40" aria-hidden />
      <img
        src="/brand/aiaiac-emblem.png"
        alt=""
        aria-hidden
        loading="lazy"
        className="absolute -bottom-52 -right-36 hidden w-[38rem] opacity-[0.07] mix-blend-screen lg:block"
      />
      <div className="shell relative grid gap-12 lg:grid-cols-12 lg:items-end">
        <Reveal className="lg:col-span-8">
          <p className="eyebrow text-emerald">Take your place</p>
          <h2 className="display-lg mt-6 max-w-4xl text-white">{conference.strapline}</h2>
        </Reveal>
        <Reveal delay={0.12} className="lg:col-span-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {registrationOptions.map((option) => (
              <ActionLink
                key={option.id}
                to="/register"
                variant={option.intent === "delegate" ? "primary" : "outline"}
                size="lg"
                className={option.intent === "delegate" ? "" : "border-white/35 text-white"}
              >
                {option.cta} {option.intent === "delegate" ? "" : option.intent}
              </ActionLink>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
