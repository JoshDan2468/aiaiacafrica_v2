import { CommitteeMemberCard } from "@/components/committee/CommitteeMemberCard";
import { cn } from "@/lib/utils";
import type { TechnicalCommitteeMember } from "@/types";

export function CommitteeLoop({
  members,
  direction = "left",
  durationSeconds = 60,
  label,
}: {
  members: TechnicalCommitteeMember[];
  direction?: "left" | "right";
  durationSeconds?: number;
  label: string;
}) {
  if (!members.length) return null;

  return (
    <div className="marquee-depth-field py-2">
      <div className="industry-loop industry-loop--compact" aria-label={label}>
        <div
          className={cn(
            "industry-loop__track",
            direction === "right" && "industry-loop__track--right",
          )}
          style={{ animationDuration: `${durationSeconds}s` }}
        >
          <ul className="industry-loop__group">
            {members.map((member) => (
              <li key={member.id}>
                <CommitteeMemberCard member={member} />
              </li>
            ))}
          </ul>
          <ul className="industry-loop__group" aria-hidden="true">
            {members.map((member) => (
              <li key={`clone-${member.id}`}>
                <CommitteeMemberCard member={member} clone />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
