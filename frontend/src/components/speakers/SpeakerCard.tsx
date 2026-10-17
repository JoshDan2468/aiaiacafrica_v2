import { CircularPersonProfile } from "@/components/common/CircularPersonProfile";
import type { Speaker } from "@/types";

export function SpeakerCard({
  speaker,
  clone = false,
}: {
  speaker: Speaker;
  archived?: boolean;
  clone?: boolean;
  compact?: boolean;
}) {
  return (
    <CircularPersonProfile
      name={speaker.name}
      role={speaker.role}
      organisation={speaker.organisation}
      image={speaker.image}
      countryCode={speaker.countryCode}
      organisationLogo={speaker.organisationLogo}
      organisationKey={speaker.organisationKey}
      clone={clone}
      variant="featured"
    />
  );
}
