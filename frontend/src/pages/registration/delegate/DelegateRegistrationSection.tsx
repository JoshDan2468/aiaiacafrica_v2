import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, CircleAlert, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { Link } from "react-router-dom";
import { ActionButton } from "@/components/common/ActionButton";
import {
  submitDelegateRegistration,
  resendRegistrationEmailVerification,
  type DelegatePackage,
  type DelegatePackagePrice,
  type DelegateRegistrationConfirmation,
  type DelegateRegistrationPayload,
} from "@/services/delegate/delegateService";
import { submitStudentApplication } from "@/services/studentVerification/studentVerificationService";
import { StudentEvidenceUploadPanel } from "./StudentEvidenceUploadPanel";
import {
  delegateRegistrationSchema,
  type DelegateRegistrationFormValues,
} from "./delegateRegistrationSchema";

type PageState = "loading" | "ready" | "empty" | "error";

interface DelegateRegistrationSectionProps {
  state: PageState;
  packages: DelegatePackage[];
  confirmation: DelegateRegistrationConfirmation | null;
  onSubmitted: (confirmation: DelegateRegistrationConfirmation) => void;
  onRetry: () => void;
  initialDelegateType?: DelegatePackage["delegateType"] | undefined;
}

const fieldClassName =
  "min-h-12 w-full border border-mineral/25 bg-white px-4 py-3 text-base text-mineral outline-none transition-[border-color,box-shadow] placeholder:text-mineral/42 hover:border-mineral/50 focus:border-forest focus:ring-2 focus:ring-forest/20 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/15";

const labelClassName = "mb-2 block text-sm font-semibold text-mineral";

function formatPrice(priceMinor: number, currency: string): string {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: priceMinor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(priceMinor / 100);
}

function getActivePrices(packageDetails: DelegatePackage): DelegatePackagePrice[] {
  return packageDetails.prices;
}

function FieldError({ id, message }: { id: string; message?: string | undefined }) {
  return message ? (
    <p id={id} role="alert" className="mt-2 text-sm font-semibold text-destructive">
      {message}
    </p>
  ) : null;
}

export function DelegateRegistrationSection({
  state,
  packages,
  confirmation,
  onSubmitted,
  onRetry,
  initialDelegateType,
}: DelegateRegistrationSectionProps) {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const initialPackage =
    packages.find((candidate) => candidate.delegateType === initialDelegateType) ?? packages[0];
  const initialPackageId = initialPackage?.id ?? "";
  const form = useForm<DelegateRegistrationFormValues>({
    resolver: zodResolver(delegateRegistrationSchema),
    defaultValues: {
      packageId: initialPackageId,
      delegateType: initialPackage?.delegateType ?? "PROFESSIONAL",
      firstName: "",
      lastName: "",
      email: "",
      mobile: "",
      telephone: "",
      jobTitle: "",
      companyName: "",
      country: "",
      primaryActivity: "",
      mainObjective: "",
      heardAboutSource: "",
      privacyConsent: false,
      dataSharingConsent: false,
      institutionName: "",
      institutionCountry: "",
      programmeOfStudy: "",
      studentIdentificationNumber: "",
      expectedGraduationYear: "",
      institutionalEmail: "",
    },
  });

  useEffect(() => {
    if (initialPackageId && !form.getValues("packageId")) {
      form.setValue("packageId", initialPackageId);
    }
  }, [form, initialPackageId]);

  const selectedPackageId = form.watch("packageId");
  const selectedPackage = useMemo(
    () => packages.find((candidate) => candidate.id === selectedPackageId) ?? initialPackage,
    [initialPackage, packages, selectedPackageId],
  );

  useEffect(() => {
    if (selectedPackage) {
      form.setValue("delegateType", selectedPackage.delegateType, { shouldValidate: false });
    }
  }, [form, selectedPackage]);

  const submit = async (values: DelegateRegistrationFormValues) => {
    setSubmissionError(null);
    const common = {
      packageId: values.packageId,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email.trim().toLowerCase(),
      mobile: values.mobile,
      telephone: values.telephone.trim() || undefined,
      country: values.country,
      mainObjective: values.mainObjective,
      heardAboutSource: values.heardAboutSource,
      privacyConsent: true as const,
      dataSharingConsent: values.dataSharingConsent,
    };
    const result =
      selectedPackage?.delegateType === "STUDENT"
        ? await submitStudentApplication({
            ...common,
            institutionName: values.institutionName,
            institutionCountry: values.institutionCountry,
            programmeOfStudy: values.programmeOfStudy,
            studentIdentificationNumber: values.studentIdentificationNumber,
            expectedGraduationYear: Number(values.expectedGraduationYear),
            institutionalEmail: values.institutionalEmail.trim().toLowerCase() || undefined,
          })
        : await submitDelegateRegistration({
            ...common,
            jobTitle: values.jobTitle,
            companyName: values.companyName,
            primaryActivity: values.primaryActivity,
          } satisfies DelegateRegistrationPayload);
    if (!result.ok) {
      setSubmissionError(
        result.status === 409
          ? "A registration already exists for this email and package."
          : result.error || "We could not submit your registration. Please try again.",
      );
      return;
    }
    onSubmitted(result.registration);
  };

  return (
    <section
      className="bg-bone py-14 sm:py-20 lg:py-24"
      aria-labelledby="delegate-registration-title"
    >
      <div className="shell">
        <div className="border-b border-mineral/18 pb-10 lg:grid lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="lg:col-span-8">
            <p className="eyebrow text-emerald-deep">AIAIAC Africa 2027</p>
            <h1 id="delegate-registration-title" className="display-lg mt-5 max-w-4xl text-mineral">
              {selectedPackage?.delegateType === "STUDENT"
                ? "Student Delegate registration"
                : "Professional Delegate registration"}
            </h1>
          </div>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground lg:col-span-4 lg:mt-0">
            Complete your details to receive a registration reference. Verify your email to continue
            with the next steps for your category.
            <a
              className="mt-3 block font-bold text-forest underline underline-offset-4"
              href="/registration/continue"
            >
              Continue an existing registration
            </a>
          </p>
        </div>

        {confirmation ? (
          <SuccessConfirmation confirmation={confirmation} packageDetails={selectedPackage} />
        ) : state === "loading" ? (
          <LoadingState />
        ) : state === "error" ? (
          <UnavailableState onRetry={onRetry} />
        ) : state === "empty" ? (
          <EmptyState />
        ) : (
          <div className="mt-10 grid gap-8 xl:grid-cols-12 xl:gap-12">
            <aside className="xl:col-span-4">
              <PackagePanel packages={packages} selectedPackage={selectedPackage} form={form} />
            </aside>
            <div className="xl:col-span-8">
              <RegistrationForm
                form={form}
                delegateType={selectedPackage?.delegateType ?? "PROFESSIONAL"}
                submissionError={submissionError}
                onSubmit={submit}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div
      className="mt-10 flex min-h-72 items-center justify-center border border-mineral/18 bg-white"
      role="status"
    >
      <LoaderCircle className="mr-3 size-5 animate-spin text-forest" aria-hidden="true" />
      <span className="text-sm font-semibold text-mineral">
        Loading available delegate packages…
      </span>
    </div>
  );
}

function UnavailableState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-10 border-l-4 border-destructive bg-white px-6 py-8" role="alert">
      <h2 className="display-md text-mineral">The registration desk is unavailable.</h2>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
        We could not load delegate packages right now. No details have been submitted.
      </p>
      <ActionButton type="button" variant="solidNavy" className="mt-6" onClick={onRetry}>
        Try again
      </ActionButton>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 border-l-4 border-forest bg-white px-6 py-8">
      <h2 className="display-md text-mineral">Delegate packages are not open yet.</h2>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Please return when the organiser opens an available delegate package.
      </p>
      <Link
        className="mt-6 inline-block text-sm font-bold text-forest underline underline-offset-4"
        to="/registration"
      >
        Return to participation options
      </Link>
    </div>
  );
}

function PackagePanel({
  packages,
  selectedPackage,
  form,
}: {
  packages: DelegatePackage[];
  selectedPackage?: DelegatePackage | undefined;
  form: UseFormReturn<DelegateRegistrationFormValues>;
}) {
  return (
    <div className="lg:sticky lg:top-28 border border-mineral bg-mineral p-6 text-white sm:p-8">
      <p className="eyebrow text-lime">Delegate category</p>
      <label htmlFor="delegate-package" className="sr-only">
        Delegate package
      </label>
      <select
        id="delegate-package"
        className="mt-5 min-h-12 w-full border border-white/20 bg-white/8 px-3 text-sm font-semibold text-white outline-none focus:border-lime focus:ring-2 focus:ring-lime/30"
        {...form.register("packageId")}
      >
        {packages.map((item) => (
          <option key={item.id} value={item.id} className="text-mineral">
            {item.name}
          </option>
        ))}
      </select>
      {selectedPackage && (
        <div className="mt-8">
          <h2 className="display-md text-white">{selectedPackage.name}</h2>
          {selectedPackage.pricingStatus === "TO_BE_CONFIRMED" ? (
            <div className="mt-6 border border-lime/35 bg-white/6 px-4 py-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/55">
                Pricing
              </p>
              <p className="mt-1 text-xl font-bold text-lime">To be confirmed</p>
              <p className="mt-2 text-xs leading-relaxed text-white/65">
                Student verification is required before payment can become available.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {getActivePrices(selectedPackage).map((price) => (
                <div key={price.currency} className="border border-white/14 bg-white/6 px-4 py-3">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/55">
                    Pay in {price.currency}
                  </p>
                  <p className="numeral mt-1 text-3xl text-lime">
                    {formatPrice(price.amountMinor, price.currency)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <p className="mt-5 text-sm leading-relaxed text-white/70">
            {selectedPackage.description}
          </p>
          <div className="mt-8 border-t border-white/14 pt-6">
            <p className="eyebrow text-white/50">Included</p>
            <ul className="mt-4 space-y-3">
              {selectedPackage.benefits.map((benefit) => (
                <li key={benefit} className="flex gap-3 text-sm leading-snug text-white/80">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-8 border-t border-white/14 pt-5 text-xs leading-relaxed text-white/52">
            {selectedPackage.delegateType === "STUDENT"
              ? "Academic verification and confirmed Student pricing are required before payment."
              : "Verify your email, complete secure payment and receive your confirmation and Event Pass by email."}
          </p>
        </div>
      )}
    </div>
  );
}

function RegistrationForm({
  form,
  delegateType,
  submissionError,
  onSubmit,
}: {
  form: UseFormReturn<DelegateRegistrationFormValues>;
  delegateType: DelegatePackage["delegateType"];
  submissionError: string | null;
  onSubmit: (values: DelegateRegistrationFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;
  return (
    <div className="border border-mineral/18 bg-white p-5 sm:p-8 lg:p-10">
      <div className="border-b border-mineral/18 pb-7">
        <p className="eyebrow text-emerald-deep">Application details</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Fields marked <span aria-hidden="true">*</span> are required. Use an email address you can
          access to verify your registration.
        </p>
      </div>
      <form
        className="mt-8"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        aria-label="Delegate registration"
      >
        <input type="hidden" {...register("delegateType")} />
        <fieldset>
          <legend className="text-lg font-bold text-mineral">Personal details</legend>
          <div className="mt-5 grid gap-x-5 gap-y-5 md:grid-cols-2">
            <TextField
              label="First name"
              required
              error={errors.firstName?.message}
              {...register("firstName")}
            />
            <TextField
              label="Last name"
              required
              error={errors.lastName?.message}
              {...register("lastName")}
            />
            <TextField
              label="Email address"
              type="email"
              autoComplete="email"
              required
              error={errors.email?.message}
              {...register("email")}
            />
            <TextField
              label="Mobile number"
              type="tel"
              autoComplete="tel"
              required
              error={errors.mobile?.message}
              {...register("mobile")}
            />
            <TextField
              label="Telephone"
              type="tel"
              autoComplete="tel"
              optional
              error={errors.telephone?.message}
              {...register("telephone")}
            />
            <TextField
              label="Country"
              autoComplete="country-name"
              required
              error={errors.country?.message}
              {...register("country")}
            />
          </div>
        </fieldset>
        <fieldset className="mt-9 border-t border-mineral/14 pt-8">
          <legend className="text-lg font-bold text-mineral">
            {delegateType === "STUDENT" ? "Academic details" : "Professional details"}
          </legend>
          {delegateType === "STUDENT" ? (
            <div className="mt-5 grid gap-x-5 gap-y-5 md:grid-cols-2">
              <TextField
                label="Institution name"
                autoComplete="organization"
                required
                error={errors.institutionName?.message}
                {...register("institutionName")}
              />
              <TextField
                label="Institution country"
                autoComplete="country-name"
                required
                error={errors.institutionCountry?.message}
                {...register("institutionCountry")}
              />
              <TextField
                label="Programme of study"
                required
                error={errors.programmeOfStudy?.message}
                {...register("programmeOfStudy")}
              />
              <TextField
                label="Student ID / registration number"
                required
                error={errors.studentIdentificationNumber?.message}
                {...register("studentIdentificationNumber")}
              />
              <TextField
                label="Expected graduation year"
                inputMode="numeric"
                placeholder="2027"
                required
                error={errors.expectedGraduationYear?.message}
                {...register("expectedGraduationYear")}
              />
              <TextField
                label="Institutional email"
                type="email"
                autoComplete="email"
                optional
                error={errors.institutionalEmail?.message}
                {...register("institutionalEmail")}
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-x-5 gap-y-5 md:grid-cols-2">
              <TextField
                label="Job title"
                autoComplete="organization-title"
                required
                error={errors.jobTitle?.message}
                {...register("jobTitle")}
              />
              <TextField
                label="Company name"
                autoComplete="organization"
                required
                error={errors.companyName?.message}
                {...register("companyName")}
              />
              <TextField
                label="Primary activity"
                required
                error={errors.primaryActivity?.message}
                {...register("primaryActivity")}
              />
            </div>
          )}
          <div className="mt-5 grid gap-x-5 gap-y-5 md:grid-cols-2">
            <TextField
              label="How did you hear about AIAIAC?"
              required
              error={errors.heardAboutSource?.message}
              {...register("heardAboutSource")}
            />
            <div className="md:col-span-2">
              <label htmlFor="delegate-main-objective" className={labelClassName}>
                Objectives for attending <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="delegate-main-objective"
                rows={5}
                maxLength={1000}
                className={`${fieldClassName} resize-y`}
                aria-invalid={Boolean(errors.mainObjective)}
                aria-describedby={
                  errors.mainObjective ? "delegate-main-objective-error" : undefined
                }
                aria-required="true"
                {...register("mainObjective")}
              />
              <FieldError
                id="delegate-main-objective-error"
                message={errors.mainObjective?.message}
              />
            </div>
          </div>
          {delegateType === "STUDENT" && (
            <div className="mt-5 border-l-4 border-forest bg-bone px-4 py-4 text-sm leading-relaxed text-muted-foreground">
              Save your academic details, then submit the required student evidence for review.
              Evidence submission instructions are available after registration.
            </div>
          )}
        </fieldset>
        <fieldset className="mt-9 border-t border-mineral/14 pt-8">
          <legend className="text-lg font-bold text-mineral">Consent</legend>
          <div className="mt-5 space-y-4">
            <CheckboxField
              id="delegate-privacy"
              required
              error={errors.privacyConsent?.message}
              {...register("privacyConsent")}
            >
              I consent to AIAIAC processing my registration details for this application.{" "}
              <span aria-hidden="true">*</span>
            </CheckboxField>
            <CheckboxField id="delegate-data-sharing" {...register("dataSharingConsent")}>
              I agree that AIAIAC may share my details with relevant conference partners where
              needed for this event.
            </CheckboxField>
          </div>
        </fieldset>
        {submissionError && (
          <div
            className="mt-7 flex gap-3 border-l-4 border-destructive bg-destructive/5 px-4 py-4"
            role="alert"
          >
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-sm font-semibold leading-relaxed text-mineral">{submissionError}</p>
          </div>
        )}
        <div className="mt-9 border-t border-mineral/18 pt-7">
          <ActionButton
            type="submit"
            variant="solidNavy"
            size="lg"
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting
              ? "Submitting application…"
              : delegateType === "STUDENT"
                ? "Save Student Delegate application"
                : "Submit delegate application"}
          </ActionButton>
          <p className="mt-4 flex max-w-2xl gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-forest" aria-hidden="true" />
            {delegateType === "STUDENT"
              ? "Student payment requires approved evidence and confirmed pricing. Saving your details does not confirm attendance."
              : "Submitting creates your registration reference. Your place is confirmed only after payment is verified."}
          </p>
        </div>
      </form>
    </div>
  );
}

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  required?: boolean | undefined;
  optional?: boolean | undefined;
  error?: string | undefined;
};

function TextField({ label, required, optional, error, ...inputProps }: TextFieldProps) {
  const id = `delegate-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label} {required && <span aria-hidden="true">*</span>}
        {optional && <span className="font-normal text-mineral"> — optional</span>}
      </label>
      <input
        id={id}
        className={fieldClassName}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-required={required}
        {...inputProps}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function CheckboxField({
  id,
  children,
  required,
  error,
  ...inputProps
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  children: React.ReactNode;
  required?: boolean | undefined;
  error?: string | undefined;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex cursor-pointer gap-3 text-sm leading-relaxed text-mineral"
      >
        <input
          id={id}
          type="checkbox"
          className="mt-1 size-4 accent-forest"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-required={required}
          {...inputProps}
        />
        <span>{children}</span>
      </label>
      {required && <span className="sr-only">Required</span>}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function SuccessConfirmation({
  confirmation,
  packageDetails,
}: {
  confirmation: DelegateRegistrationConfirmation;
  packageDetails?: DelegatePackage | undefined;
}) {
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const prices = packageDetails ? getActivePrices(packageDetails) : [];
  const isStudent = packageDetails?.delegateType === "STUDENT";
  const emailVerified = confirmation.emailVerificationStatus === "VERIFIED";

  const resendVerification = async () => {
    setResendState("sending");
    const result = await resendRegistrationEmailVerification({
      registrationReference: confirmation.reference,
      email: confirmation.email,
    });
    setResendState(result.ok ? "sent" : "error");
  };

  const confirmationCard = (
    <div className="mt-10 grid gap-8 border border-forest bg-white p-6 sm:p-10 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-8">
        <p className="eyebrow text-emerald-deep">Application received</p>
        <div className="mt-5 flex gap-4">
          <CheckCircle2 className="mt-1 size-8 shrink-0 text-forest" aria-hidden="true" />
          <div>
            <h2 className="display-md text-mineral">
              {isStudent
                ? "Your Student Delegate details are saved."
                : "Your Professional Delegate registration is saved."}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {isStudent
                ? "Keep your reference and verify your email. Academic verification remains a separate step, and payment is unavailable until both requirements are complete."
                : "Keep this reference and verify your email before payment can become available."}
            </p>
          </div>
        </div>
      </div>
      <div className="border-l-4 border-lime bg-bone px-5 py-5 lg:col-span-4">
        <dl>
          <dt className="eyebrow text-emerald-deep">Registration reference</dt>
          <dd className="numeral mt-3 text-2xl tracking-tight text-mineral">
            {confirmation.reference}
          </dd>
          <dt className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-mineral/75">
            Email status
          </dt>
          <dd className="mt-2 text-sm font-bold uppercase tracking-[0.1em] text-forest">
            {emailVerified ? "Verified" : "Unverified"}
          </dd>
        </dl>
        {packageDetails && (
          <div className="mt-5 border-t border-mineral/12 pt-4">
            <p className="text-sm font-bold text-mineral">{packageDetails.name}</p>
            {!emailVerified ? (
              <div className="mt-4 border border-mineral/14 bg-white px-3 py-3">
                <p className="text-sm font-bold text-mineral">Check your inbox</p>
                <p className="mt-2 text-xs leading-relaxed text-mineral/60">
                  We sent a single-use verification link to {confirmation.email}. Payment remains
                  unavailable until email ownership is verified.
                </p>
                <button
                  type="button"
                  className="mt-3 text-xs font-bold text-forest underline disabled:opacity-50"
                  disabled={resendState === "sending"}
                  onClick={() => void resendVerification()}
                >
                  {resendState === "sending" ? "Sending…" : "Resend verification email"}
                </button>
                {resendState === "sent" && (
                  <p className="mt-2 text-xs text-mineral/65" role="status">
                    If the details match an unverified registration, a new link has been sent.
                  </p>
                )}
                {resendState === "error" && (
                  <p className="mt-2 text-xs text-destructive" role="alert">
                    We could not process that request. Please wait and try again.
                  </p>
                )}
              </div>
            ) : isStudent ? (
              <div className="mt-4 border border-mineral/14 bg-white px-3 py-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-mineral/75">
                  Pricing
                </p>
                <p className="mt-1 text-sm font-bold text-mineral">
                  {prices.length ? "Available after approval" : "To be confirmed"}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-mineral/60">
                  Check evidence submission availability below. Payment remains unavailable.
                </p>
              </div>
            ) : (
              <div className="mt-4 border border-mineral/14 bg-white px-3 py-3">
                <p className="text-sm font-bold text-mineral">Registration saved</p>
                <p className="mt-2 text-xs leading-relaxed text-mineral/60">
                  Use secure registration access to review payment availability and continue.
                </p>
                <Link
                  className="mt-3 inline-flex min-h-11 items-center text-xs font-bold text-forest underline underline-offset-4"
                  to="/registration/continue"
                >
                  Access your registration
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (isStudent && confirmation.continuationToken) {
    return (
      <>
        {confirmationCard}
        <StudentEvidenceUploadPanel
          reference={confirmation.reference}
          continuationToken={confirmation.continuationToken}
          expiresAt={confirmation.continuationTokenExpiresAt}
        />
        <p className="mt-4 text-center text-xs text-mineral/60">
          Need to return later? Use the secure access recovery page at{" "}
          <a className="font-bold text-forest underline" href="/registration/student-verification">
            Student verification access
          </a>
          .
        </p>
      </>
    );
  }

  return confirmationCard;
}
