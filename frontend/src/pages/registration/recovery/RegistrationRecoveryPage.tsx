import { PaymentProviderSelect } from "@/components/common/PaymentProviderSelect";
import type { OnlinePaymentProvider } from "@/services/payment/paymentService";
import { CheckCircle2, CircleAlert, LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ActionButton } from "@/components/common/ActionButton";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import {
  checkRegistrationRecoveryPayment,
  exchangeRegistrationRecovery,
  getRegistrationRecoveryWorkspace,
  requestRegistrationRecovery,
  resendRecoveryEmailVerification,
  type DelegatePackageCurrency,
  type RegistrationRecoveryWorkspace,
} from "@/services/delegate/delegateService";
import { retryDelegatePayment } from "@/services/payment/paymentService";

function readRecoveryToken(): string {
  return new URLSearchParams(window.location.hash.slice(1)).get("recoveryToken") ?? "";
}

function formatPrice(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function RegistrationRecoveryPage() {
  const recoveryToken = useMemo(readRecoveryToken, []);
  const exchanged = useRef(false);
  const [email, setEmail] = useState("");
  const [requestState, setRequestState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [accessState, setAccessState] = useState<"request" | "loading" | "ready" | "invalid">(
    recoveryToken ? "loading" : "request",
  );
  const [continuationToken, setContinuationToken] = useState("");
  const [workspace, setWorkspace] = useState<RegistrationRecoveryWorkspace | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<OnlinePaymentProvider>("PAYSTACK");
  const [selectedCurrency, setSelectedCurrency] = useState<DelegatePackageCurrency>("USD");
  const [actionState, setActionState] = useState<"idle" | "working" | "sent" | "error">("idle");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    if (!recoveryToken || exchanged.current) return;
    exchanged.current = true;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    void exchangeRegistrationRecovery(recoveryToken).then((result) => {
      if (!result.ok) {
        setAccessState("invalid");
        return;
      }
      setContinuationToken(result.access.continuationToken);
      setWorkspace(result.access.workspace);
      setSelectedCurrency(result.access.workspace.availablePrices[0]?.currency ?? "USD");
      setAccessState("ready");
    });
  }, [recoveryToken]);

  const requestLink = async () => {
    setRequestState("sending");
    const result = await requestRegistrationRecovery(email);
    setRequestState(result.ok ? "sent" : "error");
  };

  const refreshWorkspace = async () => {
    if (!continuationToken) return;
    setActionState("working");
    const result = await getRegistrationRecoveryWorkspace(continuationToken);
    if (!result.ok) {
      setActionState("error");
      setActionMessage("This secure access has expired. Request a new continuation link.");
      return;
    }
    setWorkspace(result.workspace);
    setActionState("idle");
    setActionMessage("");
  };

  const resendVerification = async () => {
    if (!continuationToken) return;
    setActionState("working");
    const result = await resendRecoveryEmailVerification(continuationToken);
    setActionState(result.ok ? "sent" : "error");
    setActionMessage(
      result.ok
        ? result.message
        : result.error || "We could not request a verification email. Please try again.",
    );
  };

  const checkPaymentStatus = async () => {
    if (!continuationToken) return;
    setActionState("working");
    const result = await checkRegistrationRecoveryPayment(continuationToken);
    if (!result.ok) {
      setActionState("error");
      setActionMessage(
        result.error || "We could not check the payment status. Please try again shortly.",
      );
      return;
    }
    setWorkspace(result.workspace);
    setActionState("idle");
    setActionMessage("");
  };

  const retryPayment = async () => {
    if (!continuationToken) return;
    setActionState("working");
    const result = await retryDelegatePayment(
      continuationToken,
      selectedCurrency,
      selectedProvider,
    );
    if (!result.ok || !result.payment.authorizationUrl) {
      setActionState("error");
      setActionMessage(result.error || "We could not open secure checkout. Please try again.");
      return;
    }
    window.location.assign(result.payment.authorizationUrl);
  };

  return (
    <PublicPageLayout
      title="Continue Registration | AIAIAC Africa 2027"
      description="Securely continue an existing AIAIAC Africa 2027 delegate registration."
      canonical="/registration/continue"
      noindex
    >
      <section className="bg-bone py-16 sm:py-24">
        <div className="shell max-w-3xl">
          <div className="border border-mineral/16 bg-white p-7 sm:p-10" aria-live="polite">
            {accessState === "loading" ? (
              <Heading icon={LoaderCircle} title="Opening your registration" spin>
                We are securely validating this single-use link.
              </Heading>
            ) : accessState === "invalid" ? (
              <>
                <Heading icon={CircleAlert} title="This link cannot be used">
                  The link is invalid, expired, or has already been used. Request a new one below.
                </Heading>
                <RequestForm
                  email={email}
                  state={requestState}
                  onEmail={setEmail}
                  onSubmit={() => void requestLink()}
                />
              </>
            ) : accessState === "request" ? (
              <>
                <Heading icon={RotateCcw} title="Continue registration">
                  Enter the email used for your existing registration. For your security, we will
                  send a time-limited continuation link.
                </Heading>
                <RequestForm
                  email={email}
                  state={requestState}
                  onEmail={setEmail}
                  onSubmit={() => void requestLink()}
                />
              </>
            ) : workspace ? (
              <Workspace
                workspace={workspace}
                selectedCurrency={selectedCurrency}
                selectedProvider={selectedProvider}
                onProvider={setSelectedProvider}
                actionState={actionState}
                actionMessage={actionMessage}
                onCurrency={setSelectedCurrency}
                onRefresh={() => void refreshWorkspace()}
                onCheckPayment={() => void checkPaymentStatus()}
                onResend={() => void resendVerification()}
                onRetryPayment={() => void retryPayment()}
              />
            ) : null}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}

function RequestForm({
  email,
  state,
  onEmail,
  onSubmit,
}: {
  email: string;
  state: "idle" | "sending" | "sent" | "error";
  onEmail: (email: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="mt-8"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="block text-sm font-bold text-mineral" htmlFor="recovery-email">
        Registration email
      </label>
      <input
        id="recovery-email"
        className="mt-2 h-12 w-full border border-mineral/25 px-4 outline-none focus:border-forest"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        value={email}
        onChange={(event) => onEmail(event.target.value)}
      />
      <ActionButton
        className="mt-4"
        type="submit"
        variant="solidNavy"
        disabled={state === "sending"}
      >
        {state === "sending" ? "Sending secure link…" : "Email my continuation link"}
      </ActionButton>
      {state === "sent" ? (
        <p className="mt-4 text-sm text-forest" role="status">
          If a registration exists for this email address, we have sent a secure access link.
        </p>
      ) : state === "error" ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          We could not process that request. Please wait and try again.
        </p>
      ) : null}
    </form>
  );
}

export function Workspace({
  workspace,
  selectedCurrency,
  selectedProvider = "PAYSTACK",
  onProvider,
  actionState,
  actionMessage,
  onCurrency,
  onRefresh,
  onCheckPayment,
  onResend,
  onRetryPayment,
}: {
  workspace: RegistrationRecoveryWorkspace;
  selectedCurrency: DelegatePackageCurrency;
  selectedProvider?: OnlinePaymentProvider;
  onProvider?: (provider: OnlinePaymentProvider) => void;
  actionState: "idle" | "working" | "sent" | "error";
  actionMessage: string;
  onCurrency: (currency: DelegatePackageCurrency) => void;
  onRefresh: () => void;
  onCheckPayment: () => void;
  onResend: () => void;
  onRetryPayment: () => void;
}) {
  const latestPaymentPending =
    workspace.latestPaymentStatus === "INITIALIZED" ||
    workspace.latestPaymentStatus === "PENDING" ||
    workspace.latestPaymentStatus === "PENDING_CONFIRMATION";
  const latestPaymentUnderReview =
    workspace.latestPaymentStatus === "RECONCILIATION_REQUIRED" ||
    workspace.latestPaymentStatus === "REVERSED" ||
    workspace.latestPaymentStatus === "DUPLICATE_SUCCESS";
  const paymentConfirmed =
    workspace.paymentStatus === "PAID" || workspace.latestPaymentStatus === "PAID";
  const studentApproved =
    workspace.delegateType !== "STUDENT" || workspace.studentVerificationStatus === "APPROVED";
  const retryAllowed =
    workspace.latestPaymentStatus === null ||
    workspace.latestPaymentStatus === "FAILED" ||
    workspace.latestPaymentStatus === "ABANDONED";
  const canOfferPayment =
    workspace.emailVerificationStatus === "VERIFIED" &&
    studentApproved &&
    !paymentConfirmed &&
    retryAllowed &&
    workspace.availablePrices.length > 0;

  return (
    <>
      <Heading
        icon={paymentConfirmed ? CheckCircle2 : RotateCcw}
        title={`Welcome back, ${workspace.delegateName}`}
      >
        Your registration is saved. Review its current status and continue only where an action is
        available.
      </Heading>
      <dl className="mt-8 grid gap-4 border-y border-mineral/15 py-6 sm:grid-cols-2">
        <StatusItem label="Registration reference" value={workspace.registrationReference} />
        <StatusItem
          label="Email"
          value={workspace.emailVerificationStatus === "VERIFIED" ? "Verified" : "Unverified"}
        />
        <StatusItem
          label="Payment"
          value={
            paymentConfirmed
              ? "Confirmed"
              : formatStatus(workspace.latestPaymentStatus ?? workspace.paymentStatus)
          }
        />
        <StatusItem
          label="Category"
          value={
            workspace.delegateType === "STUDENT" ? "Student Delegate" : "Professional Delegate"
          }
        />
        {workspace.delegateType === "STUDENT" && workspace.studentVerificationStatus ? (
          <StatusItem
            label="Student verification"
            value={formatStatus(workspace.studentVerificationStatus)}
          />
        ) : null}
        {workspace.eventPassStatus ? (
          <StatusItem label="Event Pass" value={formatStatus(workspace.eventPassStatus)} />
        ) : null}
      </dl>

      {paymentConfirmed ? (
        <StateMessage title="Payment confirmed" tone="success">
          Your payment is confirmed. No payment action is needed.
          {workspace.eventPassStatus === "ACTIVE"
            ? " Your Event Pass is active."
            : workspace.eventPassStatus === "REVOKED"
              ? " Your Event Pass is currently unavailable; please contact the organiser."
              : " Event Pass details will be sent through the confirmation workflow."}
        </StateMessage>
      ) : workspace.emailVerificationStatus === "UNVERIFIED" ? (
        <StateMessage title="Verify your email to continue">
          Use the verification link sent to your registration email. Payment is unavailable until
          your email is verified.
          <ActionButton
            className="mt-4"
            type="button"
            variant="solidNavy"
            disabled={actionState === "working"}
            onClick={onResend}
          >
            Resend verification email
          </ActionButton>
        </StateMessage>
      ) : workspace.delegateType === "STUDENT" &&
        workspace.studentVerificationStatus === "REJECTED" ? (
        <StateMessage title="Student application not approved" tone="critical">
          This Student application has reached a final decision. Payment is not available. Contact
          the organiser if you need clarification.
        </StateMessage>
      ) : workspace.delegateType === "STUDENT" &&
        workspace.studentVerificationStatus === "MORE_INFORMATION_REQUIRED" ? (
        <StateMessage title="More information is required" tone="attention">
          The review team needs an update before your Student application can continue.
          <StudentWorkflowLink label="Provide the requested information" />
        </StateMessage>
      ) : workspace.delegateType === "STUDENT" &&
        workspace.studentVerificationStatus === "PENDING" ? (
        <StateMessage title="Student application under review">
          Your evidence has been received and is being reviewed. Payment will remain unavailable
          until your application is approved.
          <StudentWorkflowLink label="View Student application" />
        </StateMessage>
      ) : workspace.delegateType === "STUDENT" &&
        (workspace.studentVerificationStatus === "NOT_SUBMITTED" ||
          workspace.studentVerificationStatus === null) ? (
        <StateMessage title="Complete your Student application">
          Submit the required academic evidence before review can begin. Payment is not available at
          this stage.
          <StudentWorkflowLink label="Continue Student verification" />
        </StateMessage>
      ) : latestPaymentPending ? (
        <StateMessage title="Payment confirmation is being checked" tone="attention">
          Please do not start another payment. Use “Check payment status” to request the latest
          confirmed state.
        </StateMessage>
      ) : latestPaymentUnderReview ? (
        <StateMessage title="Payment review in progress" tone="attention">
          Your registration remains saved while the payment is reviewed. Do not make another
          payment; the organiser will resolve the current transaction.
        </StateMessage>
      ) : workspace.delegateType === "STUDENT" &&
        workspace.studentVerificationStatus === "APPROVED" &&
        workspace.availablePrices.length === 0 ? (
        <StateMessage title="Student application approved" tone="success">
          Your Student application is approved. Payment is not available yet; return to this secure
          workspace when pricing has been made available.
        </StateMessage>
      ) : canOfferPayment ? (
        <div className="mt-6">
          <StateMessage
            title={
              workspace.latestPaymentStatus === "FAILED"
                ? "No payment was confirmed"
                : workspace.latestPaymentStatus === "ABANDONED"
                  ? "Your registration is still saved"
                  : "Your registration is ready for payment"
            }
            tone={workspace.latestPaymentStatus ? "attention" : "neutral"}
          >
            {workspace.latestPaymentStatus === "FAILED"
              ? "The previous payment attempt failed, but your registration is safe. You may start a new payment."
              : workspace.latestPaymentStatus === "ABANDONED"
                ? "The previous checkout was not completed. You may start a new payment when ready."
                : "Choose an available currency to continue to secure checkout."}
          </StateMessage>
          <fieldset>
            <legend className="text-sm font-bold text-mineral">Choose payment currency</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {workspace.availablePrices.map((price) => (
                <label
                  key={price.currency}
                  className="flex cursor-pointer items-center gap-3 border border-mineral/16 p-4"
                >
                  <input
                    type="radio"
                    name="recovery-payment-currency"
                    value={price.currency}
                    checked={selectedCurrency === price.currency}
                    onChange={() => onCurrency(price.currency)}
                  />
                  <span className="font-bold text-mineral">
                    {formatPrice(price.amountMinor, price.currency)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <PaymentProviderSelect
            value={selectedProvider}
            onChange={(provider) => onProvider?.(provider)}
            disabled={actionState === "working"}
          />
          <ActionButton
            className="mt-5"
            type="button"
            variant="solidNavy"
            disabled={actionState === "working" || workspace.availablePrices.length === 0}
            onClick={onRetryPayment}
          >
            {actionState === "working"
              ? "Opening secure checkout…"
              : workspace.latestPaymentStatus === null
                ? "Continue to payment"
                : "Try payment again"}
          </ActionButton>
        </div>
      ) : (
        <StateMessage title="Payment is not available yet">
          Your registration is saved. No payment option is currently available for this
          registration.
        </StateMessage>
      )}

      {!paymentConfirmed && !latestPaymentUnderReview ? (
        <button
          className="mt-6 min-h-11 text-sm font-bold text-forest underline underline-offset-4 disabled:opacity-50"
          type="button"
          disabled={actionState === "working"}
          onClick={latestPaymentPending ? onCheckPayment : onRefresh}
        >
          {latestPaymentPending ? "Check payment status" : "Refresh registration status"}
        </button>
      ) : null}
      {actionMessage ? (
        <p
          className={`mt-3 text-sm ${actionState === "error" ? "text-destructive" : "text-forest"}`}
          role={actionState === "error" ? "alert" : "status"}
        >
          {actionMessage}
        </p>
      ) : null}
    </>
  );
}

function StateMessage({
  title,
  tone = "neutral",
  children,
}: {
  title: string;
  tone?: "neutral" | "success" | "attention" | "critical";
  children: React.ReactNode;
}) {
  const border =
    tone === "success"
      ? "border-lime"
      : tone === "attention"
        ? "border-amber-500"
        : tone === "critical"
          ? "border-destructive"
          : "border-forest";
  return (
    <div className={`mt-6 border-l-4 ${border} bg-bone px-5 py-4`}>
      <h2 className="font-display text-xl font-bold text-mineral">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-mineral/75">{children}</div>
    </div>
  );
}

function StudentWorkflowLink({ label }: { label: string }) {
  return (
    <Link
      className="mt-4 flex min-h-11 w-fit items-center font-bold text-forest underline underline-offset-4"
      to="/registration/student-verification"
    >
      {label}
    </Link>
  );
}

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-mineral/55">{label}</dt>
      <dd className="mt-1 font-semibold text-mineral">{value}</dd>
    </div>
  );
}

function Heading({
  icon: Icon,
  title,
  children,
  spin = false,
}: {
  icon: typeof CheckCircle2;
  title: string;
  children: React.ReactNode;
  spin?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <Icon
        className={`mt-1 size-8 shrink-0 text-forest ${spin ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      <div>
        <p className="eyebrow text-emerald-deep">Registration recovery</p>
        <h1 className="display-md mt-3 text-mineral">{title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-mineral/70">{children}</p>
      </div>
    </div>
  );
}
