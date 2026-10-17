import { PaymentProviderSelect } from "@/components/common/PaymentProviderSelect";
import type { OnlinePaymentProvider } from "@/services/payment/paymentService";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ActionButton } from "@/components/common/ActionButton";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import {
  verifyRegistrationEmail,
  type DelegatePackageCurrency,
  type EmailVerificationConfirmation,
} from "@/services/delegate/delegateService";
import { retryDelegatePayment } from "@/services/payment/paymentService";

function readToken(): string {
  return new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
}

function formatPrice(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export function EmailVerificationPage() {
  const token = useMemo(readToken, []);
  const started = useRef(false);
  const [state, setState] = useState<"checking" | "verified" | "invalid">("checking");
  const [verification, setVerification] = useState<EmailVerificationConfirmation | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<OnlinePaymentProvider>("PAYSTACK");
  const [selectedCurrency, setSelectedCurrency] = useState<DelegatePackageCurrency>("USD");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [openingPayment, setOpeningPayment] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    if (!token) {
      setState("invalid");
      return;
    }
    void verifyRegistrationEmail(token).then((result) => {
      if (!result.ok) {
        setState("invalid");
        return;
      }
      setVerification(result.verification);
      setSelectedCurrency(result.verification.availablePrices[0]?.currency ?? "USD");
      setState("verified");
    });
  }, [token]);

  const proceedToPayment = async () => {
    if (!verification) return;
    if (!verification.continuationToken) {
      setPaymentError(
        "Secure payment access is no longer available from this link. Request a new secure access link to continue.",
      );
      return;
    }
    setOpeningPayment(true);
    setPaymentError(null);
    const result = await retryDelegatePayment(
      verification.continuationToken,
      selectedCurrency,
      selectedProvider,
    );
    if (!result.ok || !result.payment.authorizationUrl) {
      setPaymentError(result.error || "We could not open secure checkout. Please try again.");
      setOpeningPayment(false);
      return;
    }
    window.location.assign(result.payment.authorizationUrl);
  };

  return (
    <PublicPageLayout
      title="Verify Email | AIAIAC Africa 2027"
      description="Verify the email address used for an AIAIAC Africa 2027 registration."
      canonical="/registration/verify-email"
      noindex
    >
      <section className="bg-bone py-16 sm:py-24">
        <div className="shell max-w-3xl">
          <div className="border border-mineral/16 bg-white p-7 sm:p-10">
            {state === "checking" ? (
              <StatusHeading icon={LoaderCircle} title="Verifying your email…" spin>
                We are securely validating this single-use link.
              </StatusHeading>
            ) : state === "invalid" ? (
              <>
                <StatusHeading icon={CircleAlert} title="This link cannot be used">
                  The verification link is invalid, expired, or has already been used. Return to
                  your registration confirmation to request a new link.
                </StatusHeading>
                <Link
                  className="mt-7 inline-flex font-bold text-forest underline"
                  to="/registration/delegate"
                >
                  Return to Delegate Registration
                </Link>
              </>
            ) : verification ? (
              <>
                <StatusHeading icon={CheckCircle2} title="Email verified">
                  Your email ownership is confirmed for registration reference{" "}
                  <strong>{verification.registrationReference}</strong>.
                </StatusHeading>
                {verification.delegateType === "STUDENT" ? (
                  <div className="mt-8 border-l-4 border-lime bg-bone p-5">
                    <p className="font-bold text-mineral">Continue your Student Delegate journey</p>
                    <p className="mt-2 text-sm leading-relaxed text-mineral/70">
                      Email verification is complete. Academic approval remains a separate required
                      step before payment can become available.
                    </p>
                    <Link
                      className="mt-4 inline-flex font-bold text-forest underline"
                      to="/registration/student-verification"
                    >
                      Continue to Student verification access
                    </Link>
                  </div>
                ) : (
                  <div className="mt-8 border-l-4 border-lime bg-bone p-5">
                    {verification.continuationToken ? (
                      <>
                        <fieldset>
                          <legend className="text-sm font-bold text-mineral">
                            Choose payment currency
                          </legend>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {verification.availablePrices.map((price) => (
                              <label
                                key={price.currency}
                                className="flex cursor-pointer items-center gap-3 border border-mineral/16 bg-white p-4"
                              >
                                <input
                                  type="radio"
                                  name="verified-payment-currency"
                                  value={price.currency}
                                  checked={selectedCurrency === price.currency}
                                  onChange={() => setSelectedCurrency(price.currency)}
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
                          onChange={setSelectedProvider}
                          disabled={openingPayment}
                        />
                        <ActionButton
                          className="mt-5"
                          type="button"
                          variant="solidNavy"
                          disabled={openingPayment || verification.availablePrices.length === 0}
                          onClick={() => void proceedToPayment()}
                        >
                          {openingPayment ? "Opening secure checkout…" : "Proceed to payment"}
                        </ActionButton>
                      </>
                    ) : (
                      <div role="alert">
                        <p className="text-sm font-bold text-mineral">
                          Secure payment access has expired
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-mineral/70">
                          Request a new secure access link before continuing to payment.
                        </p>
                        <Link
                          className="mt-4 inline-flex min-h-11 items-center font-bold text-forest underline underline-offset-4"
                          to="/registration/continue"
                        >
                          Access your registration
                        </Link>
                      </div>
                    )}
                    {verification.availablePrices.length === 0 && verification.continuationToken ? (
                      <p className="mt-3 text-sm text-mineral/70">
                        Registration pricing is not currently available.
                      </p>
                    ) : null}
                    {paymentError && (
                      <p className="mt-3 text-sm font-semibold text-destructive" role="alert">
                        {paymentError}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}

function StatusHeading({
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
        <p className="eyebrow text-emerald-deep">Email ownership verification</p>
        <h1 className="display-md mt-3 text-mineral">{title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-mineral/70">{children}</p>
      </div>
    </div>
  );
}
