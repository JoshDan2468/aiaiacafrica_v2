import { AnimatedSection } from "@/components/common/AnimatedSection";

export function ConferenceTeamSection() {
  return (
    <section
      id="conference-team"
      aria-labelledby="conference-team-title"
      className="on-navy relative overflow-hidden bg-[#031008] py-12 text-white sm:py-16 lg:py-20 border-t border-white/10"
    >
      <div className="shell">
        <AnimatedSection className="max-w-3xl border-l-2 border-lime pl-5 sm:pl-7">
          <h2
            id="conference-team-title"
            className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl"
          >
            Conference Team
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-white/70 sm:text-base">
            The leadership, advisory board, technical committees, and event coordinators driving
            AIAIAC Africa 2027.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
