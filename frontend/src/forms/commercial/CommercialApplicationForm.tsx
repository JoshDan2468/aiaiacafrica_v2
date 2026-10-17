import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import type { CommercialApplicationConfirmation } from "@/services/commercialApplication/commercialApplicationService";

interface PackageOption {
  code: string;
  title: string;
  priceLabel: string;
}

interface ValidationResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: { issues: { path: (string | number)[]; message: string }[] };
}

export function CommercialApplicationForm({
  kind,
  packages,
  validate,
  submit,
  onSubmitted,
}: {
  kind: "Sponsor" | "Exhibitor";
  packages: readonly PackageOption[];
  validate: (value: unknown) => ValidationResult;
  submit: (
    value: Record<string, unknown>,
  ) => Promise<
    { ok: true; confirmation: CommercialApplicationConfirmation } | { ok: false; error: string }
  >;
  onSubmitted: (confirmation: CommercialApplicationConfirmation) => void;
}) {
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const packageField = kind === "Sponsor" ? "sponsorshipTier" : "exhibitionOption";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const raw: Record<string, unknown> = Object.fromEntries(form.entries());
    raw["consent"] = form.get("consent") === "on";
    const parsed = validate(raw);
    if (!parsed.success || !parsed.data) {
      setErrors(
        Object.fromEntries(
          (parsed.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      const firstField = String(parsed.error?.issues[0]?.path[0] ?? "");
      const target = event.currentTarget.elements.namedItem(firstField);
      if (target instanceof HTMLElement) target.focus();
      else if (target instanceof RadioNodeList && target[0] instanceof HTMLElement)
        target[0].focus();
      return;
    }
    setErrors({});
    setState("submitting");
    try {
      const result = await submit(parsed.data);
      if (!result.ok) {
        setState("error");
        return;
      }
      onSubmitted(result.confirmation);
    } catch {
      setState("error");
    }
  };

  const fieldClass =
    "mt-2 min-h-12 w-full border border-mineral/25 bg-white px-3 text-sm text-slate-900 outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 aria-[invalid=true]:border-red-700";
  const input = (name: string, label: string, required = false, type = "text") => (
    <label className="text-sm font-bold text-slate-800">
      {label}
      {required ? " *" : ""}
      <input
        className={fieldClass}
        name={name}
        type={type}
        required={required}
        autoComplete={
          (
            {
              organizationName: "organization",
              contactFirstName: "given-name",
              contactLastName: "family-name",
              contactEmail: "email",
              contactPhone: "tel",
              contactJobTitle: "organization-title",
              country: "country-name",
              website: "url",
            } as Record<string, string>
          )[name]
        }
        aria-required={required}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `commercial-${name}-error` : undefined}
      />
      {errors[name] && (
        <span
          id={`commercial-${name}-error`}
          role="alert"
          className="mt-1 block text-sm text-red-700"
        >
          {errors[name]}
        </span>
      )}
    </label>
  );

  return (
    <form
      className="space-y-9"
      aria-label={`${kind} application`}
      aria-busy={state === "submitting"}
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
    >
      <p className="border-b border-mineral/15 pb-6 text-sm leading-6 text-slate-600">
        Fields marked * are required. Use a contact email our team can reach.
      </p>
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 font-display text-xl font-bold text-forest">
          Organisation details
        </legend>
        <div className="sm:col-span-2">{input("organizationName", "Organisation name", true)}</div>
        {input("country", "Country", true)}
        {input("industry", "Industry")}
        {input("website", "Website (optional)", false, "url")}
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 font-display text-xl font-bold text-forest">Primary contact</legend>
        {input("contactFirstName", "First name", true)}
        {input("contactLastName", "Last name", true)}
        {input("contactEmail", "Work email", true, "email")}
        {input("contactPhone", "Phone number", true, "tel")}
        {input("contactJobTitle", "Job title")}
      </fieldset>

      <fieldset>
        <legend className="font-display text-xl font-bold text-forest">
          {kind === "Sponsor" ? "Sponsorship tier" : "Exhibition space"}
        </legend>
        <div className="mt-4 divide-y divide-mineral/15 border-y border-mineral/15">
          {packages.map((option) => (
            <label
              className="flex min-h-16 cursor-pointer items-center gap-3 px-3 py-4 text-sm transition-colors hover:bg-bone has-[:checked]:bg-bone has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest"
              key={option.code}
            >
              <input
                name={packageField}
                type="radio"
                value={option.code}
                className="size-4 shrink-0 accent-forest"
                aria-invalid={Boolean(errors[packageField])}
                aria-describedby={errors[packageField] ? "commercial-package-error" : undefined}
                aria-required="true"
              />
              <span className="font-bold text-slate-900">{option.title}</span>
              <span className="ml-auto shrink-0 text-sm font-semibold text-forest">
                {option.priceLabel}
              </span>
            </label>
          ))}
        </div>
        {errors[packageField] && (
          <p id="commercial-package-error" role="alert" className="mt-2 text-sm text-red-700">
            Select a package to continue.
          </p>
        )}
      </fieldset>

      <label className="block text-sm font-bold text-slate-800">
        Requirements or additional information (optional)
        <textarea className={`${fieldClass} min-h-32 py-3`} name="notes" maxLength={2000} />
      </label>

      <label className="flex items-start gap-3 border-l-2 border-forest bg-bone p-4 text-sm text-slate-700">
        <input
          className="mt-1 size-4 shrink-0 accent-forest"
          name="consent"
          type="checkbox"
          aria-required="true"
          aria-invalid={Boolean(errors["consent"])}
          aria-describedby={errors["consent"] ? "commercial-consent-error" : undefined}
        />
        <span>
          I confirm that these details are accurate. I understand that this application is subject
          to review and does not confirm payment or participation.
          {errors["consent"] && (
            <span
              id="commercial-consent-error"
              role="alert"
              className="mt-1 block text-sm text-red-700"
            >
              {errors["consent"]}
            </span>
          )}
        </span>
      </label>

      {state === "submitting" && (
        <p role="status" className="text-sm text-forest">
          Submitting application. Please wait.
        </p>
      )}
      {state === "error" && (
        <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">
          The application could not be submitted. Check your connection and try again.
        </p>
      )}
      <button
        className="inline-flex min-h-12 items-center gap-2 bg-forest px-6 transition-colors hover:bg-mineral focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest text-sm font-bold text-white disabled:opacity-60"
        disabled={state === "submitting"}
        type="submit"
      >
        {state === "submitting" && <LoaderCircle className="size-4 animate-spin" />}
        {state === "submitting" ? "Submitting application…" : `Submit ${kind} application`}
      </button>
    </form>
  );
}
