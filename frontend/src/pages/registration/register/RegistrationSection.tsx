import { conference } from "@/data/conference";
import { registrationOptions } from "@/data/registration";
import { ParticipationRequestForm } from "@/forms/participation/ParticipationRequestForm";
import type { RegistrationOption } from "@/types";

interface RegistrationSectionProps {
  intent: RegistrationOption["intent"];
  onIntentChange: (intent: RegistrationOption["intent"]) => void;
}

export function RegistrationSection({ intent, onIntentChange }: RegistrationSectionProps) {
  return (
    <main className="on-navy pt-32 lg:pt-40">
      <div className="shell pb-24 lg:pb-32">
        <p className="eyebrow text-emerald">
          {conference.datesShort} · {conference.venue}
        </p>
        <h1 className="display-lg mt-6 max-w-3xl text-white">Register your participation</h1>

        <section className="mt-14 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <ul className="space-y-px bg-white/12">
              {registrationOptions.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => onIntentChange(option.intent)}
                    aria-pressed={intent === option.intent}
                    className={`w-full p-6 text-left transition-colors duration-300 ${
                      intent === option.intent
                        ? "bg-emerald text-navy-900"
                        : "bg-navy hover:bg-navy-700"
                    }`}
                  >
                    <span className="font-display text-lg font-bold">{option.title}</span>
                    <span className="mt-2 block text-sm opacity-75">{option.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <ParticipationRequestForm intent={intent} />
        </section>
      </div>
    </main>
  );
}
