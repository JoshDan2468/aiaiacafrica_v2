import { useState } from "react";
import { ActionButton } from "@/components/common/ActionButton";
import { conference } from "@/data/conference";
import type { RegistrationOption } from "@/types";

interface ParticipationRequestFormProps {
  intent: RegistrationOption["intent"];
}

/**
 * Temporary Phase-1 participation form retained from the original public site.
 * Replace it with separate feature forms once each workflow's fields are confirmed.
 */
export function ParticipationRequestForm({ intent }: ParticipationRequestFormProps) {
  const [sent, setSent] = useState(false);

  return (
    <form
      className="lg:col-span-6 lg:col-start-7"
      onSubmit={(event) => {
        event.preventDefault();
        setSent(true);
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {[
          { name: "fullName", label: "Full name", type: "text" },
          { name: "email", label: "Work email", type: "email" },
          { name: "company", label: "Company", type: "text" },
          { name: "jobTitle", label: "Job title", type: "text" },
          { name: "country", label: "Country", type: "text" },
          { name: "phone", label: "Phone", type: "tel" },
        ].map((field) => (
          <label key={field.name} className="block">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.24em] text-white/50">
              {field.label}
            </span>
            <input
              required={field.name !== "phone"}
              type={field.type}
              name={field.name}
              className="mt-2 h-12 w-full border border-white/20 bg-transparent px-4 text-sm text-white outline-none transition-colors focus:border-emerald"
            />
          </label>
        ))}
      </div>
      <label className="mt-5 block">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.24em] text-white/50">
          Message
        </span>
        <textarea
          name="message"
          rows={4}
          className="mt-2 w-full border border-white/20 bg-transparent p-4 text-sm text-white outline-none transition-colors focus:border-emerald"
        />
      </label>
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <ActionButton type="submit" size="lg">
          Submit {intent} request
        </ActionButton>
        {sent && (
          <p role="status" className="text-sm text-emerald">
            Thank you — the team will contact you at {conference.contact.email}.
          </p>
        )}
      </div>
    </form>
  );
}
