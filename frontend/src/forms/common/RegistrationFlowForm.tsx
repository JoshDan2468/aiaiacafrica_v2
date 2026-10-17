import { useState, type FormEvent } from "react";
import type { z } from "zod";
import { ActionButton, ActionLink } from "@/components/common/ActionButton";
import { activeEvent } from "@/data/event";

export interface RegistrationField {
  name: string;
  label: string;
  type?: "text" | "email" | "tel";
  required?: boolean;
  wide?: boolean;
}

export function RegistrationFlowForm({
  flowLabel,
  schema,
  fields,
}: {
  flowLabel: string;
  schema: z.ZodTypeAny;
  fields: RegistrationField[];
}) {
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const result = schema.safeParse(values);

    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0] ?? "form");
        if (!nextErrors[field]) nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      setSent(false);
      return;
    }

    setErrors({});
    setSent(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="border border-white/14 bg-white/[0.035] p-6 sm:p-9"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => {
          const error = errors[field.name];
          return (
            <label key={field.name} className={field.wide ? "sm:col-span-2" : undefined}>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-white/58">
                {field.label}
                {field.required ? " *" : ""}
              </span>
              <input
                name={field.name}
                type={field.type ?? "text"}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${field.name}-error` : undefined}
                className="mt-2 h-12 w-full border border-white/20 bg-transparent px-4 text-sm text-white outline-none transition-colors focus:border-emerald"
              />
              {error && (
                <span
                  id={`${field.name}-error`}
                  className="mt-2 block text-xs text-emerald"
                  role="alert"
                >
                  {error}
                </span>
              )}
            </label>
          );
        })}
      </div>
      <label className="mt-5 block">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-white/58">
          Optional message
        </span>
        <textarea
          name="message"
          rows={5}
          aria-invalid={Boolean(errors["message"])}
          className="mt-2 w-full border border-white/20 bg-transparent p-4 text-sm text-white outline-none transition-colors focus:border-emerald"
        />
        {errors["message"] && (
          <span className="mt-2 block text-xs text-emerald">{errors["message"]}</span>
        )}
      </label>
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <ActionButton type="submit" size="lg">
          Check {flowLabel} details
        </ActionButton>
        {sent && (
          <div role="status" className="max-w-md text-sm leading-relaxed text-emerald">
            <p>
              Your details look complete. Online {activeEvent.edition} enquiries are not yet open,
              so nothing has been sent or saved.
            </p>
            <ActionLink to="/contact" variant="ghost" size="sm" className="mt-3 px-0 text-white">
              Contact the AIAIAC team
            </ActionLink>
          </div>
        )}
      </div>
    </form>
  );
}
