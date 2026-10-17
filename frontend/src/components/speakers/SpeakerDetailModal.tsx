import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CircularPersonProfile } from "@/components/common/CircularPersonProfile";
import { CountryFlag } from "@/components/common/CountryFlag";
import { organisations, getOrganisationLogo } from "@/data/organisations";
import type { RosterPerson } from "@/data/speakersRoster";

interface SpeakerDetailModalProps {
  speaker: RosterPerson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpeakerDetailModal({ speaker, open, onOpenChange }: SpeakerDetailModalProps) {
  if (!speaker) return null;

  const orgLogo = speaker.organisationKey
    ? organisations[speaker.organisationKey]?.logo
    : getOrganisationLogo(speaker.organisation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-[#214A36] bg-[#071C13] p-6 text-[#F6F4EC] shadow-2xl sm:max-w-lg sm:p-8 sm:rounded-2xl">
        <DialogHeader className="flex flex-col items-center text-center">
          {/* Centered Circular Portrait */}
          <div className="mb-4">
            <CircularPersonProfile
              name={speaker.name}
              role={speaker.role}
              organisation={speaker.organisation}
              organisationKey={speaker.organisationKey}
              countryCode={speaker.countryCode}
              image={speaker.image}
              size="keynote"
              tone="dark"
              showDetails={false}
            />
          </div>

          <DialogTitle className="font-display text-xl font-bold tracking-tight text-[#F6F4EC] sm:text-2xl">
            {speaker.name}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm font-normal text-[#97B0A4]">
            {speaker.role} —{" "}
            <span className="font-semibold text-[#CADB7E]">{speaker.organisation}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Metadata Badges Strip */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 border-y border-white/10 py-3">
          {speaker.categories
            .filter((cat) => cat !== "All")
            .map((cat) => (
              <span
                key={cat}
                className="rounded-full border border-[#214A36] bg-[#0D2C20] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-[#CFEA3B]"
              >
                {cat}
              </span>
            ))}
          {speaker.countryCode && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/80">
              <CountryFlag code={speaker.countryCode} />
              <span>{speaker.countryCode}</span>
            </span>
          )}
          {orgLogo && (
            <span className="flex items-center rounded-lg bg-[#F7F5EE] px-2 py-0.5">
              <img
                src={orgLogo}
                alt={speaker.organisation}
                className="max-h-5 max-w-[60px] object-contain"
              />
            </span>
          )}
        </div>

        {/* Speaker Profile Statement / Bio */}
        <div className="mt-4 text-xs leading-relaxed text-white/75 sm:text-sm">
          <p>
            {speaker.bio ||
              `Distinguished industry authority and technical leader contributing to the AIAIAC Africa 2027 exchange.`}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
