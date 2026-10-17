import { AnimatedSection } from "@/components/common/AnimatedSection";
import { CommitteeLoop } from "@/components/committee/CommitteeLoop";
import { advisoryBoardMembers } from "@/data/advisoryBoard";
import type { TechnicalCommitteeMember } from "@/types";

export function AdvisoryBoardSection() {
  const mappedMembers: TechnicalCommitteeMember[] = advisoryBoardMembers.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    organisation: m.organisation,
    showOrganisationLogo: m.showOrganisationLogo,
    image: m.image ?? "",
    ...(m.countryCode ? { countryCode: m.countryCode } : {}),
    ...(m.organisationLogo ? { organisationLogo: m.organisationLogo } : {}),
    ...(m.organisationKey ? { organisationKey: m.organisationKey } : {}),
  }));

  return (
    <section
      id="advisory-board"
      aria-labelledby="advisory-board-title"
      className="on-navy people-section-bg relative overflow-hidden py-16 text-white lg:py-24 border-t border-white/10"
    >
      <div className="shell">
        <AnimatedSection className="max-w-3xl border-l-2 border-lime pl-5 sm:pl-7">
          <h2
            id="advisory-board-title"
            className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            Advisory Board
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
            Distinguished industry leaders and senior experts guiding the strategic direction and
            technical excellence of AIAIAC 2027.
          </p>
        </AnimatedSection>
      </div>

      <div className="mt-12 lg:mt-16">
        <CommitteeLoop
          members={mappedMembers}
          direction="left"
          durationSeconds={65}
          label="Advisory Board"
        />
      </div>
    </section>
  );
}
