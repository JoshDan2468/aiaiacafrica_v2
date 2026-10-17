import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, LoaderCircle, MailCheck } from "lucide-react";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { StudentEvidenceUploadPanel } from "@/pages/registration/delegate/StudentEvidenceUploadPanel";
import {
  exchangeStudentVerificationRecovery,
  requestStudentVerificationRecovery,
} from "@/services/studentVerification/studentVerificationService";

interface StudentAccess {
  registrationReference: string;
  continuationToken: string;
  continuationTokenExpiresAt: string;
}

export function StudentVerificationAccessPage() {
  const [access, setAccess] = useState<StudentAccess | null>(null);
  const [registrationReference, setRegistrationReference] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"ready" | "exchanging" | "requesting" | "sent" | "error">(
    "ready",
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const recoveryToken = params.get("recoveryToken");
    if (!recoveryToken) return;

    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    setState("exchanging");
    void exchangeStudentVerificationRecovery(recoveryToken).then((result) => {
      if (!result.ok) {
        setState("error");
        setMessage(
          "This secure recovery link is invalid or has expired. Request a new link below.",
        );
        return;
      }
      setAccess(result.access);
      setState("ready");
      setMessage(null);
    });
  }, []);

  const requestAccess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("requesting");
    setMessage(null);
    const result = await requestStudentVerificationRecovery({ registrationReference, email });
    if (!result.ok) {
      setState("error");
      setMessage("We could not process the request. Please wait and try again.");
      return;
    }
    setState("sent");
    setMessage(result.message);
  };

  return (
    <PublicPageLayout
      title="Student verification access | AIAIAC 2027"
      description="Securely continue an AIAIAC 2027 Student Delegate verification application."
      noindex
    >
      <section className="bg-bone px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-3xl">
            <p className="eyebrow text-emerald-deep">AIAIAC 2027 Student Delegate</p>
            <h1 className="display-lg mt-4 text-mineral">Continue your verification</h1>
            <p className="mt-5 text-base leading-relaxed text-mineral/70">
              Check whether private evidence submission is available for your application. Payment
              becomes available only after approval and confirmation of Student Delegate pricing.
            </p>
          </div>

          {access ? (
            <StudentEvidenceUploadPanel
              reference={access.registrationReference}
              continuationToken={access.continuationToken}
              expiresAt={access.continuationTokenExpiresAt}
            />
          ) : (
            <div className="mt-10 max-w-xl border border-mineral/15 bg-white p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <KeyRound className="mt-1 size-6 shrink-0 text-forest" aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-bold text-mineral">Request a secure access link</h2>
                  <p className="mt-2 text-sm leading-relaxed text-mineral/65">
                    Enter the registration reference and email used for the Student Delegate
                    application. For privacy, the response is the same whether or not the details
                    match a record.
                  </p>
                </div>
              </div>

              <form className="mt-6 space-y-4" onSubmit={(event) => void requestAccess(event)}>
                <label className="block text-sm font-bold text-mineral">
                  Registration reference
                  <input
                    className="mt-2 min-h-12 w-full border border-mineral/20 bg-white px-4 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                    value={registrationReference}
                    onChange={(event) => setRegistrationReference(event.target.value.toUpperCase())}
                    autoComplete="off"
                    required
                  />
                </label>
                <label className="block text-sm font-bold text-mineral">
                  Application email
                  <input
                    className="mt-2 min-h-12 w-full border border-mineral/20 bg-white px-4 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                <button
                  className="inline-flex min-h-12 items-center gap-2 bg-mineral px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  type="submit"
                  disabled={state === "requesting" || state === "exchanging"}
                >
                  {state === "requesting" || state === "exchanging" ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <MailCheck className="size-4" aria-hidden="true" />
                  )}
                  Email secure link
                </button>
              </form>

              {message && (
                <p
                  className={`mt-5 text-sm font-semibold ${
                    state === "error" ? "text-destructive" : "text-forest"
                  }`}
                  role={state === "error" ? "alert" : "status"}
                >
                  {message}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </PublicPageLayout>
  );
}
