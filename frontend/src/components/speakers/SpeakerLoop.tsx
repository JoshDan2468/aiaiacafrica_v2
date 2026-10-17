import { SpeakerCard } from "@/components/speakers/SpeakerCard";
import { cn } from "@/lib/utils";
import type { Speaker } from "@/types";

export function SpeakerLoop({
  speakers,
  direction = "left",
  label,
}: {
  speakers: Speaker[];
  direction?: "left" | "right";
  label: string;
}) {
  if (!speakers.length) return null;

  return (
    <div className="marquee-depth-field py-2">
      <div className="industry-loop industry-loop--featured" aria-label={label}>
        <div
          className={cn(
            "industry-loop__track",
            direction === "right" && "industry-loop__track--right",
          )}
        >
          <ul className="industry-loop__group">
            {speakers.map((speaker) => (
              <li key={speaker.id}>
                <SpeakerCard speaker={speaker} />
              </li>
            ))}
          </ul>
          <ul className="industry-loop__group" aria-hidden="true">
            {speakers.map((speaker) => (
              <li key={`clone-${speaker.id}`}>
                <SpeakerCard speaker={speaker} clone />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
