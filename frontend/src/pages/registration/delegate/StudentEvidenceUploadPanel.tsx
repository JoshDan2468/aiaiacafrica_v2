import { PaymentProviderSelect } from "@/components/common/PaymentProviderSelect";
import type { OnlinePaymentProvider } from "@/services/payment/paymentService";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileLock2, LoaderCircle, ShieldAlert, Upload } from "lucide-react";
import { initializeDelegatePayment } from "@/services/payment/paymentService";
import {
  getStudentVerificationState,
  submitStudentVerification,
  uploadStudentEvidence,
  type StudentEvidenceMetadata,
  type StudentEvidenceType,
  type StudentVerificationPublicState,
} from "@/services/studentVerification/studentVerificationService";

const enrolmentTypes: Array<{ value: StudentEvidenceType; label: string }> = [
  { value: "COURSE_REGISTRATION", label: "Course registration" },
  { value: "ENROLMENT_LETTER", label: "Enrolment letter" },
  { value: "TUITION_OR_SCHOOL_FEE_RECEIPT", label: "Tuition or school-fee receipt" },
  {
    value: "TRANSCRIPT_OR_ENROLMENT_STATEMENT",
    label: "Transcript or enrolment statement",
  },
  {
    value: "OTHER_INSTITUTIONAL_ENROLMENT_EVIDENCE",
    label: "Other institutional enrolment evidence",
  },
];

const verificationStatusLabels = {
  NOT_SUBMITTED: "Not submitted for review",
  PENDING: "Review in progress",
  MORE_INFORMATION_REQUIRED: "More information required",
  APPROVED: "Approved",
  REJECTED: "Not approved",
} as const;

const unavailableMessage =
  "Student evidence upload and verification submission are temporarily unavailable. Your saved registration is retained.";

function evidenceStatus(evidence: StudentEvidenceMetadata | undefined) {
  if (!evidence) return { label: "Not uploaded", tone: "text-mineral/55" };
  if (evidence.documentStatus === "AVAILABLE") {
    return { label: "Ready", tone: "text-forest" };
  }
  if (evidence.documentStatus === "REJECTED") {
    return { label: "Rejected", tone: "text-destructive" };
  }
  if (["UNAVAILABLE", "ERROR"].includes(evidence.scanStatus)) {
    return { label: "Unable to verify file safely", tone: "text-amber-700" };
  }
  return { label: "Processing", tone: "text-amber-700" };
}

function EvidenceSlot({
  title,
  description,
  evidence,
  evidenceType,
  typeOptions,
  disabled,
  editable,
  onTypeChange,
  onUploaded,
}: {
  title: string;
  description: string;
  evidence?: StudentEvidenceMetadata | undefined;
  evidenceType: StudentEvidenceType;
  typeOptions?: Array<{ value: StudentEvidenceType; label: string }> | undefined;
  disabled: boolean;
  editable: boolean;
  onTypeChange?: ((value: StudentEvidenceType) => void) | undefined;
  onUploaded: (file: File) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const status = evidenceStatus(evidence);

  return (
    <form
      className="border border-mineral/15 bg-bone/45 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (file) void onUploaded(file).then(() => setFile(null));
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-mineral">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-mineral/60">{description}</p>
        </div>
        <span className={`shrink-0 text-xs font-bold ${status.tone}`}>{status.label}</span>
      </div>
      {evidence && (
        <p className="mt-3 break-all text-xs text-mineral/60">
          {evidence.displayFilename} · {(evidence.sizeBytes / 1024).toFixed(0)} KB
        </p>
      )}
      {!editable && (
        <p className="mt-4 text-xs font-semibold text-mineral/65">
          Evidence is locked while this application is in its current verification state.
        </p>
      )}
      {editable && typeOptions && onTypeChange && (
        <label className="mt-4 block text-xs font-bold text-mineral">
          Document type
          <select
            className="mt-2 min-h-11 w-full border border-mineral/20 bg-white px-3 text-sm"
            value={evidenceType}
            onChange={(event) => onTypeChange(event.target.value as StudentEvidenceType)}
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {editable && (
        <>
          <label className="mt-4 block text-xs font-bold text-mineral">
            Choose PDF, JPEG, or PNG
            <input
              className="mt-2 block w-full text-xs file:mr-3 file:border-0 file:bg-mineral file:px-3 file:py-2 file:font-bold file:text-white"
              type="file"
              name={evidenceType}
              accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
              disabled={disabled}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <button
            className="mt-4 inline-flex min-h-10 items-center gap-2 bg-mineral px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={disabled || !file}
          >
            {disabled ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="size-4" aria-hidden="true" />
            )}
            {evidence ? "Replace evidence" : "Upload evidence"}
          </button>
        </>
      )}
    </form>
  );
}

export function StudentEvidenceUploadPanel({
  reference,
  continuationToken,
  expiresAt,
}: {
  reference: string;
  continuationToken: string;
  expiresAt?: string | undefined;
}) {
  const [verification, setVerification] = useState<StudentVerificationPublicState | null>(null);
  const [enrolmentType, setEnrolmentType] = useState<StudentEvidenceType>("COURSE_REGISTRATION");
  const [activeCategory, setActiveCategory] = useState<"STUDENT_ID" | "ENROLMENT" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<OnlinePaymentProvider>("PAYSTACK");
  const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "NGN">("USD");
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await getStudentVerificationState(reference, continuationToken);
    if (!result.ok) {
      setVerification(null);
      setMessage(result.status === 503 ? unavailableMessage : result.error);
      return;
    }
    setVerification(result.verification);
    const prices = result.verification.availablePrices ?? [];
    setSelectedCurrency((current) =>
      prices.some((price) => price.currency === current) ? current : (prices[0]?.currency ?? "USD"),
    );
  }, [continuationToken, reference]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = useMemo(
    () => ({
      studentId: verification?.evidence.find((item) => item.category === "STUDENT_ID"),
      enrolment: verification?.evidence.find((item) => item.category === "ENROLMENT"),
    }),
    [verification],
  );

  const upload = async (
    category: "STUDENT_ID" | "ENROLMENT",
    evidenceType: StudentEvidenceType,
    file: File,
    existing?: StudentEvidenceMetadata,
  ) => {
    setActiveCategory(category);
    setMessage(null);
    const result = await uploadStudentEvidence({
      reference,
      continuationToken,
      evidenceType,
      file,
      ...(existing ? { replacementEvidenceId: existing.evidenceId } : {}),
    });
    if (!result.ok) {
      if (result.status === 503) setVerification(null);
      setMessage(result.status === 503 ? unavailableMessage : result.error);
      setActiveCategory(null);
      return;
    }
    await load();
    setMessage(
      result.result.evidence.documentStatus === "AVAILABLE"
        ? "Evidence uploaded and verified safely."
        : result.result.evidence.documentStatus === "REJECTED"
          ? "The file was rejected and is not available to reviewers."
          : "Evidence is stored privately but is not available to reviewers until safety scanning succeeds.",
    );
    setActiveCategory(null);
  };

  const submit = async () => {
    setActiveCategory("STUDENT_ID");
    setMessage(null);
    const result = await submitStudentVerification(reference, continuationToken);
    if (!result.ok) {
      if (result.status === 503) setVerification(null);
      setMessage(result.status === 503 ? unavailableMessage : result.error);
      setActiveCategory(null);
      return;
    }
    await load();
    setMessage("Your evidence has been submitted for review. No payment is due at this stage.");
    setActiveCategory(null);
  };

  const readiness = verification?.evidenceReadiness;
  const editable = verification?.evidenceEditingAllowed ?? false;
  const status = verification?.verificationStatus ?? "NOT_SUBMITTED";
  const availablePrices = verification?.availablePrices ?? [];
  const selectedPrice = availablePrices.find((price) => price.currency === selectedCurrency);

  const proceedToPayment = async () => {
    if (!verification?.paymentAvailable || !selectedPrice) return;
    setIsInitializingPayment(true);
    setPaymentError(null);
    const result = await initializeDelegatePayment(
      reference,
      selectedPrice.currency,
      selectedProvider,
    );
    if (!result.ok || !result.payment.authorizationUrl) {
      setPaymentError(result.error || "We could not open secure checkout. Please try again.");
      setIsInitializingPayment(false);
      return;
    }
    window.location.assign(result.payment.authorizationUrl);
  };

  if (!verification) {
    return (
      <section className="mt-8 border border-forest/25 bg-white p-6 sm:p-8" role="status">
        <p className="text-sm font-semibold text-mineral">
          {message ?? "Checking Student evidence availability…"}
        </p>
      </section>
    );
  }

  return (
    <section
      className="mt-8 border border-forest/25 bg-white p-6 sm:p-8"
      aria-labelledby="evidence-title"
    >
      <div className="flex gap-4">
        <FileLock2 className="mt-1 size-7 shrink-0 text-forest" aria-hidden="true" />
        <div>
          <p className="eyebrow text-emerald-deep">Private document upload</p>
          <h2 id="evidence-title" className="display-md mt-3 text-mineral">
            Add your Student Delegate evidence
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-mineral/65">
            Upload a current student ID and at least one institutional enrolment document. Files are
            private, limited to 5 MB each, and are not available to reviewers unless the safety scan
            succeeds.
          </p>
          {expiresAt && (
            <p className="mt-2 text-xs text-mineral/55">
              This secure upload session expires {new Date(expiresAt).toLocaleString("en-GB")}.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <EvidenceSlot
          title="Current student ID"
          description="A current institution-issued student identification card or document."
          evidence={current.studentId}
          evidenceType="CURRENT_STUDENT_ID"
          disabled={activeCategory !== null}
          editable={editable}
          onUploaded={(file) => upload("STUDENT_ID", "CURRENT_STUDENT_ID", file, current.studentId)}
        />
        <EvidenceSlot
          title="Institutional enrolment evidence"
          description="Choose one document that demonstrates current enrolment."
          evidence={current.enrolment}
          evidenceType={enrolmentType}
          typeOptions={enrolmentTypes}
          disabled={activeCategory !== null}
          editable={editable}
          onTypeChange={setEnrolmentType}
          onUploaded={(file) => upload("ENROLMENT", enrolmentType, file, current.enrolment)}
        />
      </div>

      <div
        className={`mt-5 flex gap-3 border-l-4 px-4 py-3 text-sm ${
          readiness?.minimumEvidenceReady
            ? "border-forest bg-forest/5 text-forest"
            : "border-amber-500 bg-amber-50 text-amber-900"
        }`}
        role="status"
      >
        {readiness?.minimumEvidenceReady ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        ) : (
          <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        )}
        <p className="font-semibold">
          {readiness?.minimumEvidenceReady
            ? "Minimum evidence is ready. This does not approve the application or enable payment."
            : "Minimum evidence is not ready. Both required categories must pass safety scanning."}
        </p>
      </div>
      {verification && (
        <div className="mt-5 border border-mineral/15 bg-bone/35 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-deep">
            Verification status: {verificationStatusLabels[status]}
          </p>
          {status === "PENDING" && (
            <p className="mt-2 text-sm text-mineral/70">
              Your application is under review. Evidence is locked until a decision is made.
            </p>
          )}
          {status === "MORE_INFORMATION_REQUIRED" && (
            <p className="mt-2 text-sm text-mineral/70">
              More information is required: {verification.latestReviewReason}
            </p>
          )}
          {status === "APPROVED" && (
            <div className="mt-2 text-sm text-mineral/70">
              {verification.paymentStatus === "PAID" ? (
                <p>Payment confirmed. Your Event Pass will be sent by email.</p>
              ) : verification.paymentAvailable ? (
                <>
                  <p>
                    Your Student Delegate status has been approved. Select an active price to
                    continue to secure payment.
                  </p>
                  <fieldset className="mt-4">
                    <legend className="text-xs font-bold uppercase tracking-wide">
                      Choose payment currency
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {availablePrices.map((price) => (
                        <label
                          key={price.currency}
                          className="flex cursor-pointer items-center gap-2 border border-mineral/20 p-3"
                        >
                          <input
                            type="radio"
                            name="student-payment-currency"
                            value={price.currency}
                            checked={selectedCurrency === price.currency}
                            onChange={() => setSelectedCurrency(price.currency)}
                          />
                          {new Intl.NumberFormat(price.currency === "NGN" ? "en-NG" : "en-US", {
                            style: "currency",
                            currency: price.currency,
                          }).format(price.amountMinor / 100)}{" "}
                          ({price.currency})
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <PaymentProviderSelect
                    value={selectedProvider}
                    onChange={setSelectedProvider}
                    disabled={isInitializingPayment}
                  />
                  <button
                    className="mt-4 min-h-11 bg-forest px-5 text-sm font-bold text-white disabled:opacity-50"
                    type="button"
                    disabled={isInitializingPayment || !selectedPrice}
                    onClick={() => void proceedToPayment()}
                  >
                    {isInitializingPayment
                      ? "Opening secure checkout…"
                      : "Proceed to Student Delegate payment"}
                  </button>
                  {paymentError && (
                    <p className="mt-2 text-destructive" role="alert">
                      {paymentError}
                    </p>
                  )}
                </>
              ) : (
                <p>
                  Your Student Delegate status has been approved. Registration pricing and payment
                  instructions will be made available once confirmed.
                </p>
              )}
            </div>
          )}
          {status === "REJECTED" && (
            <p className="mt-2 text-sm text-mineral/70">
              This application was not approved: {verification.latestReviewReason}
            </p>
          )}
          {verification.submissionAllowed && (
            <button
              className="mt-4 inline-flex min-h-11 items-center gap-2 bg-forest px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={activeCategory !== null}
              onClick={() => void submit()}
            >
              {activeCategory !== null && (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              )}
              {status === "MORE_INFORMATION_REQUIRED"
                ? "Resubmit for verification"
                : "Submit for verification"}
            </button>
          )}
        </div>
      )}
      {message && (
        <p className="mt-4 text-sm font-semibold text-mineral" role="alert">
          {message}
        </p>
      )}
    </section>
  );
}
