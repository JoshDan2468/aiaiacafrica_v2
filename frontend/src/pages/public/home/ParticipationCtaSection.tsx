import { CTASection } from "@/components/common/CTASection";

export function ParticipationCtaSection() {
  return (
    <CTASection
      title="Choose how you want to participate in 2027"
      description="Delegate, exhibitor and sponsor routes are separated so each can evolve safely when requirements are confirmed."
      primaryLabel="Registration options"
      primaryTo="/registration"
      secondaryLabel="Contact the team"
      secondaryTo="/contact"
    />
  );
}
