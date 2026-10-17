import { AnimatedSection } from "@/components/common/AnimatedSection";
import { CommitteeLoop } from "@/components/committee/CommitteeLoop";
import { committeeIntro, technicalCommittees } from "@/data/committee";

export function CommitteeRailSection() {
  const assetIntegrity =
    technicalCommittees.find((c) => c.slug === "asset-integrity")?.members ?? [];
  const aiCommittee =
    technicalCommittees.find((c) => c.slug === "artificial-intelligence")?.members ?? [];
  const automationCyber =
    technicalCommittees.find((c) => c.slug === "automation-cybersecurity")?.members ?? [];

  // Split Asset Integrity (21 members) into 2 rows (11 & 10)
  const assetRow1 = assetIntegrity.slice(0, 11);
  const assetRow2 = assetIntegrity.slice(11);

  // Split Automation & Cybersecurity (17 members) into 2 rows (9 & 8)
  const autoRow1 = automationCyber.slice(0, 9);
  const autoRow2 = automationCyber.slice(9);

  return (
    <section
      id="technical-committees"
      aria-labelledby="technical-committees-title"
      className="on-navy people-section-bg relative overflow-hidden py-20 text-white lg:py-28"
    >
      <div className="shell">
        <AnimatedSection className="max-w-3xl border-l-2 border-lime pl-5 sm:pl-7">
          <h2
            id="technical-committees-title"
            className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl"
          >
            Technical Committees
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
            {committeeIntro}
          </p>
        </AnimatedSection>
      </div>

      <div className="mt-16 space-y-20 lg:mt-24 lg:space-y-24">
        {/* Committee 1: Asset Integrity Technical Committee (21 members) */}
        <div className="space-y-6">
          <div className="shell">
            <h3 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Asset Integrity Technical Committee
            </h3>
          </div>
          <div className="space-y-6">
            <CommitteeLoop
              members={assetRow1}
              direction="right"
              durationSeconds={54}
              label="Asset Integrity Technical Committee Row 1"
            />
            <CommitteeLoop
              members={assetRow2}
              direction="left"
              durationSeconds={61}
              label="Asset Integrity Technical Committee Row 2"
            />
          </div>
        </div>

        {/* Committee 2: Artificial Intelligence Technical Committee (6 members) */}
        <div className="space-y-6">
          <div className="shell">
            <h3 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Artificial Intelligence Technical Committee
            </h3>
          </div>
          <CommitteeLoop
            members={aiCommittee}
            direction="left"
            durationSeconds={55}
            label="Artificial Intelligence Technical Committee"
          />
        </div>

        {/* Committee 3: Automation & Cybersecurity Technical Committee (17 members) */}
        <div className="space-y-6">
          <div className="shell">
            <h3 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Automation & Cybersecurity Technical Committee
            </h3>
          </div>
          <div className="space-y-6">
            <CommitteeLoop
              members={autoRow1}
              direction="right"
              durationSeconds={56}
              label="Automation & Cybersecurity Technical Committee Row 1"
            />
            <CommitteeLoop
              members={autoRow2}
              direction="left"
              durationSeconds={63}
              label="Automation & Cybersecurity Technical Committee Row 2"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
