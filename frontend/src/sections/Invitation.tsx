import { conference } from "@/data/conference";
import { exhibitionImage } from "@/data/media";
import { ActionLink } from "@/components/common/ActionButton";
import { Reveal } from "@/components/common/Reveal";

export function Invitation() {
  return (
    <section className="on-navy relative overflow-hidden py-24 lg:py-32">
      <div className="grid-lines absolute inset-0 opacity-40" aria-hidden />
      <div className="shell relative grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Reveal>
            <p className="eyebrow text-emerald">Official Invitation</p>
            <h2 className="display-lg mt-6 text-white">You are invited</h2>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="relative mt-10 aspect-[4/3] overflow-hidden">
              <img
                src={exhibitionImage}
                alt="Delegates on the AIAC West Africa exhibition floor"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-navy-900/25" />
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          {conference.invitation.map((p, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <p className="mb-6 text-base leading-relaxed text-white/72 lg:text-lg">{p}</p>
            </Reveal>
          ))}
          <Reveal delay={0.24}>
            <p className="mt-8 border-t border-white/15 pt-6 font-mono text-xs uppercase tracking-[0.24em] text-emerald">
              {conference.dualConferenceNote}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <ActionLink to="/register" size="lg">
                Reserve Your Place
              </ActionLink>
              <ActionLink href="#programme" variant="outline" size="lg" className="text-white">
                View Programme
              </ActionLink>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
