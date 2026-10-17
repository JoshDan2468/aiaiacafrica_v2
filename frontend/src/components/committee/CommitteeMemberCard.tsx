import { CircularPersonProfile } from "@/components/common/CircularPersonProfile";
import type { TechnicalCommitteeMember } from "@/types";

export function CommitteeMemberCard({
  member,
  clone = false,
}: {
  member: TechnicalCommitteeMember;
  clone?: boolean;
}) {
  return (
    <CircularPersonProfile
      name={member.name}
      role={member.role}
      organisation={member.organisation}
      image={member.image}
      countryCode={member.countryCode}
      organisationLogo={member.organisationLogo}
      organisationKey={member.organisationKey}
      showOrganisationLogo={member.showOrganisationLogo}
      clone={clone}
      variant="compact"
    />
  );
}
