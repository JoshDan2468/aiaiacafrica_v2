import { AnimatedSection } from "@/components/common/AnimatedSection";
import { CommitteeLoop } from "@/components/committee/CommitteeLoop";
import { organisingCommitteeMembers } from "@/data/organisingCommittee";
import type { TechnicalCommitteeMember } from "@/types";

export function OrganisingCommitteeSection() {
  const mappedMembers: TechnicalCommitteeMember[] = organisingCommitteeMembers.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    organisation: m.organisation,
    image: m.image ?? "",
    ...(m.countryCode ? { countryCode: m.countryCode } : {}),
    ...(m.organisationLogo ? { organisationLogo: m.organisationLogo } : {}),
    ...(m.organisationKey ? { organisationKey: m.organisationKey } : {}),
  }));

  // 11 members split into 2 rows (6 & 5)
  const row1 = mappedMembers.slice(0, 6);
  const row2 = mappedMembers.slice(6);

  return (
    <section
      id="organising-committee"
      aria-labelledby="organising-committee-title"
      className="on-navy people-section-bg relative overflow-hidden py-14 text-white lg:py-20 border-t border-white/10"
    >
      <div className="shell">
        <AnimatedSection className="max-w-3xl border-l-2 border-lime pl-5 sm:pl-7">
          <h2
            id="organising-committee-title"
            className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl"
          >
            Organising Committee
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-white/70 sm:text-base">
            The dedicated event coordinators and operational specialists driving conference
            execution and delegate experience.
          </p>
        </AnimatedSection>
      </div>

      <div className="mt-10 space-y-6 lg:mt-14">
        <CommitteeLoop
          members={row1}
          direction="right"
          durationSeconds={52}
          label="Organising Committee Row 1"
        />
        <CommitteeLoop
          members={row2}
          direction="left"
          durationSeconds={60}
          label="Organising Committee Row 2"
        />
      </div>
    </section>
  );
}
