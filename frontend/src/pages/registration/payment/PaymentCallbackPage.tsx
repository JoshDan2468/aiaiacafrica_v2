import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import {
  verifyDelegatePayment,
  type PaymentSummary,
  type PaymentTransactionStatus,
} from "@/services/payment/paymentService";

const pendingStatuses: PaymentTransactionStatus[] = [
  "INITIALIZED",
  "PENDING",
  "PENDING_CONFIRMATION",
];
const reviewStatuses: PaymentTransactionStatus[] = [
  "RECONCILIATION_REQUIRED",
  "REVERSED",
  "DUPLICATE_SUCCESS",
];

export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const reference =
    searchParams.get("reference") ?? searchParams.get("trxref") ?? searchParams.get("tx_ref");
  const [state, setState] = useState<"checking" | "ready" | "error">("checking");
  const [payment, setPayment] = useState<PaymentSummary | null>(null);
  const [verificationAttempt, setVerificationAttempt] = useState(0);

  useEffect(() => {
    if (!reference) {
      setState("error");
      return;
    }
    void verifyDelegatePayment(reference).then((result) => {
      if (!result.ok) {
        setState("error");
        return;
      }
      setPayment(result.payment);
      setState("ready");
    });
  }, [reference, verificationAttempt]);

  const status = payment?.status;
  const pending = status ? pendingStatuses.includes(status) : false;
  const underReview = status ? reviewStatuses.includes(status) : false;
  const retryAllowed = status === "FAILED" || status === "ABANDONED";

  return (
    <PublicPageLayout
      title="Payment Status | AIAIAC Africa 2027"
      description="Confirm your AIAIAC delegate payment status."
      noindex
    >
      <section className="bg-bone py-20 sm:py-28">
        <div className="shell max-w-3xl">
          <div className="border border-mineral/18 bg-white p-7 sm:p-10" aria-live="polite">
            {state === "checking" ? (
              <Status
                icon={<LoaderCircle className="size-7 animate-spin text-forest" />}
                title="Checking payment…"
              >
                We are checking the transaction with the payment provider.
              </Status>
            ) : state === "error" ? (
              <Status
                icon={<CircleAlert className="size-8 text-destructive" />}
                title="We could not confirm this payment"
              >
                {reference
                  ? "We could not check the payment right now. Please try again shortly or securely access your saved registration."
                  : "This page needs a payment reference. Securely access your saved registration to see its current status."}
              </Status>
            ) : status === "PAID" ? (
              <Status
                icon={<CheckCircle2 className="size-8 text-forest" />}
                title="Payment confirmed"
              >
                Your payment is confirmed. Your confirmation and Event Pass information will be sent
                through the event email workflow.
              </Status>
            ) : pending ? (
              <Status
                icon={<CircleAlert className="size-8 text-amber-600" />}
                title="We’re still checking your payment"
              >
                Confirmation has not arrived yet. Please do not make another payment while this
                transaction is being checked.
              </Status>
            ) : underReview ? (
              <Status
                icon={<CircleAlert className="size-8 text-amber-600" />}
                title="Your payment is being reviewed"
              >
                Your registration remains saved while this transaction is reviewed. Do not make
                another payment; securely access your registration for the latest status.
              </Status>
            ) : retryAllowed ? (
              <Status
                icon={<CircleAlert className="size-8 text-amber-600" />}
                title="Payment wasn’t completed"
              >
                Your registration is still saved and no payment was confirmed. Securely access it to
                try payment again when you are ready.
              </Status>
            ) : (
              <Status
                icon={<CircleAlert className="size-8 text-amber-600" />}
                title="Payment is not available"
              >
                Your registration remains saved. Securely access it for the latest status and
                available actions.
              </Status>
            )}

            {payment && state === "ready" ? (
              <dl className="mt-8 grid gap-x-8 gap-y-4 border-t border-mineral/15 pt-6 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-mineral/60">
                    Registration reference
                  </dt>
                  <dd className="mt-1 break-all text-sm font-semibold text-mineral">
                    {payment.registrationReference}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-mineral/60">
                    Delegate category
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-mineral">{payment.package}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-mineral/60">
                    Amount ({payment.currency})
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-mineral">
                    {payment.displayAmount}
                  </dd>
                </div>
              </dl>
            ) : null}

            {(pending || (state === "error" && reference)) && (
              <button
                className="mt-6 flex min-h-11 items-center text-sm font-bold text-forest underline underline-offset-4"
                type="button"
                onClick={() => {
                  setState("checking");
                  setVerificationAttempt((attempt) => attempt + 1);
                }}
              >
                Check Payment Status
              </button>
            )}

            {retryAllowed ? (
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
                <Link
                  className="flex min-h-11 items-center text-sm font-bold text-forest underline underline-offset-4"
                  to="/registration/continue"
                >
                  Try Payment Again
                </Link>
                <Link
                  className="flex min-h-11 items-center text-sm font-bold text-forest underline underline-offset-4"
                  to="/registration/continue"
                >
                  Access Registration
                </Link>
              </div>
            ) : underReview || state === "error" ? (
              <Link
                className="mt-6 flex min-h-11 w-fit items-center text-sm font-bold text-forest underline underline-offset-4"
                to="/registration/continue"
              >
                Access Registration
              </Link>
            ) : null}

            <div className="mt-8 border-t border-mineral/15 pt-5">
              <Link
                className="flex min-h-11 w-fit items-center text-sm font-bold text-forest underline underline-offset-4"
                to="/contact"
              >
                Contact the organiser
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}

function Status({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 shrink-0" aria-hidden="true">
        {icon}
      </div>
      <div>
        <p className="eyebrow text-emerald-deep">Delegate payment</p>
        <h1 className="display-md mt-3 text-mineral">{title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
