import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { abstractSubmissionGuidance, abstractTopics } from "@/data/brochure";
import {
  countAbstractWords,
  createAbstractIdempotencyKey,
  exchangeAbstractRecovery,
  getAbstractWorkspace,
  requestAbstractRecovery,
  resubmitAbstract,
  saveAbstractRevision,
  submitAbstract,
  type AbstractAccess,
  type AbstractContent,
  type AbstractWorkspace,
} from "@/services/abstractSubmission/abstractSubmissionService";

const inputClass =
  "mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20";

function ContentFields({
  value,
  onChange,
}: {
  value: AbstractContent;
  onChange: (value: AbstractContent) => void;
}) {
  const wordCount = countAbstractWords(value.abstractBody);
  return (
    <div className="space-y-5">
      <label className="block text-sm font-bold text-slate-800">
        Abstract title *
        <input
          className={inputClass}
          minLength={5}
          maxLength={300}
          required
          value={value.title}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
        />
      </label>
      <p className="text-sm leading-6 text-slate-600">
        Outline the purpose, approach, findings and relevance of your work in up to 500 words.
      </p>
      <label className="block text-sm font-bold text-slate-800">
        Abstract body *
        <textarea
          className={`${inputClass} min-h-64 py-3 leading-6`}
          minLength={20}
          maxLength={10000}
          required
          value={value.abstractBody}
          id="abstract-body"
          aria-describedby="abstract-word-count"
          aria-invalid={wordCount > 500}
          onChange={(event) => onChange({ ...value, abstractBody: event.target.value })}
        />
      </label>
      <p
        id="abstract-word-count"
        className={`text-sm font-semibold ${wordCount > 500 ? "text-red-700" : "text-slate-600"}`}
        role="status"
      >
        {wordCount} / 500 words
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-800">
          Keywords (optional)
          <input
            className={inputClass}
            maxLength={500}
            value={value.keywords ?? ""}
            onChange={(event) => onChange({ ...value, keywords: event.target.value })}
          />
        </label>
        <label className="text-sm font-bold text-slate-800">
          Topic area (optional)
          <select
            className={inputClass}
            value={value.topic ?? ""}
            onChange={(event) => onChange({ ...value, topic: event.target.value })}
          >
            <option value="">No topic selected</option>
            {abstractTopics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function AuthorWorkspace({ access }: { access: AbstractAccess }) {
  const [workspace, setWorkspace] = useState<AbstractWorkspace | null>(null);
  const [content, setContent] = useState<AbstractContent>({ title: "", abstractBody: "" });
  const [state, setState] = useState<"loading" | "ready" | "working" | "error">("loading");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getAbstractWorkspace(access).then((result) => {
      if (!result.ok) {
        setState("error");
        setMessage("This secure workspace link has expired. Request a new link below.");
        return;
      }
      setWorkspace(result.workspace);
      setContent({
        title: result.workspace.title,
        abstractBody: result.workspace.abstractBody,
        keywords: result.workspace.keywords ?? "",
        topic: result.workspace.topic ?? "",
      });
      setState("ready");
    });
  }, [access]);

  const save = async () => {
    if (countAbstractWords(content.abstractBody) > 500) {
      setMessage("Shorten the abstract to 500 words or fewer.");
      document.getElementById("abstract-body")?.focus();
      return;
    }
    setState("working");
    const result = await saveAbstractRevision(access, content);
    setState(result.ok ? "ready" : "error");
    setMessage(
      result.ok
        ? "Revision saved. Explicitly resubmit it when ready."
        : (result.error ?? "Revision could not be saved."),
    );
    if (result.ok) {
      setWorkspace(result.workspace);
      setSaved(true);
    }
  };

  const resubmit = async () => {
    setState("working");
    const result = await resubmitAbstract(access);
    setState(result.ok ? "ready" : "error");
    setMessage(
      result.ok
        ? "Abstract revision resubmitted successfully."
        : (result.error ?? "Resubmission failed."),
    );
    if (result.ok) {
      setWorkspace(result.workspace);
      setSaved(false);
    }
  };

  if (state === "loading") return <p role="status">Loading your abstract workspace…</p>;
  if (!workspace) return <p role="alert">{message}</p>;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wider text-forest">Author workspace</p>
      <h2 className="mt-2 font-display text-2xl font-bold text-slate-900">{workspace.reference}</h2>
      <p className="mt-2 text-sm font-semibold text-slate-600">
        Status: {workspace.status.replaceAll("_", " ")}
      </p>
      {workspace.status === "SUBMITTED" && (
        <p className="mt-5 text-sm">Your abstract has been submitted.</p>
      )}
      {workspace.status === "UNDER_REVIEW" && (
        <p className="mt-5 text-sm">Your abstract is currently under review.</p>
      )}
      {workspace.status === "ACCEPTED" && (
        <p className="mt-5 text-sm">
          Your abstract has been accepted. Further speaker information will be communicated
          separately.
        </p>
      )}
      {workspace.status === "REJECTED" && (
        <p className="mt-5 text-sm">
          We are unable to accept your abstract at this time. {workspace.currentReviewReason}
        </p>
      )}
      {workspace.status === "REVISION_REQUIRED" && (
        <div className="mt-6 space-y-6">
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Revision instruction: {workspace.currentReviewReason}
          </p>
          <ContentFields
            value={content}
            onChange={(value) => {
              setContent(value);
              setSaved(false);
            }}
          />
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-forest px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              disabled={state === "working" || countAbstractWords(content.abstractBody) > 500}
              onClick={() => void save()}
              type="button"
            >
              Save revision
            </button>
            <button
              className="rounded-lg border border-forest px-5 py-3 text-sm font-bold text-forest disabled:opacity-50"
              disabled={!saved || state === "working"}
              onClick={() => void resubmit()}
              type="button"
            >
              Resubmit for review
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className="mt-5 text-sm font-semibold" role={state === "error" ? "alert" : "status"}>
          {message}
        </p>
      )}
    </section>
  );
}

export function AbstractSubmissionPage() {
  const submissionKey = useRef<string | null>(null);
  const [access, setAccess] = useState<AbstractAccess | null>(null);
  const [content, setContent] = useState<AbstractContent>({ title: "", abstractBody: "" });
  const [state, setState] = useState<"ready" | "submitting" | "requesting" | "exchanging">("ready");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("recoveryToken");
    if (!token) return;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    setState("exchanging");
    void exchangeAbstractRecovery(token).then((result) => {
      setState("ready");
      if (result.ok) setAccess(result.access);
      else {
        setMessageIsError(true);
        setMessage("This recovery link is invalid or expired. Request a new link below.");
      }
    });
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (countAbstractWords(content.abstractBody) > 500) {
      setMessageIsError(true);
      setMessage("Shorten the abstract to 500 words or fewer.");
      document.getElementById("abstract-body")?.focus();
      return;
    }
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (fields["consent"] !== "on") {
      setMessageIsError(true);
      setMessage("Please acknowledge the submission statement.");
      return;
    }
    submissionKey.current ??= createAbstractIdempotencyKey();
    setState("submitting");
    setMessage("");
    const result = await submitAbstract({
      idempotencyKey: submissionKey.current,
      authorFirstName: String(fields["authorFirstName"] ?? ""),
      authorLastName: String(fields["authorLastName"] ?? ""),
      authorEmail: String(fields["authorEmail"] ?? ""),
      authorPhone: String(fields["authorPhone"] ?? ""),
      organizationName: String(fields["organizationName"] ?? ""),
      jobTitle: String(fields["jobTitle"] ?? ""),
      country: String(fields["country"] ?? ""),
      ...content,
      consent: true,
    });
    setState("ready");
    setMessageIsError(!result.ok);
    if (result.ok) {
      setAccess({
        reference: result.confirmation.reference,
        continuationToken: result.confirmation.continuationToken,
        continuationTokenExpiresAt: result.confirmation.continuationTokenExpiresAt,
      });
      setMessage("Abstract submitted successfully. Save your reference for future access.");
    } else {
      setMessage(
        result.status === 410
          ? "The Abstract submission deadline has passed."
          : (result.error ?? "Submission failed. Please try again."),
      );
    }
  };

  const recover = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("requesting");
    setMessage("");
    const result = await requestAbstractRecovery(reference.trim().toUpperCase(), email.trim());
    setState("ready");
    setMessageIsError(!result.ok);
    setMessage(
      result.ok ? result.message : (result.error ?? "The request could not be completed."),
    );
  };

  return (
    <PublicPageLayout
      title="Abstract Submission | AIAIAC Africa 2027"
      description="Submit a 500-word Abstract for AIAIAC 2027 in Lagos, Nigeria."
      canonical="/registration/abstract"
    >
      <header className="bg-[#05190F] pb-12 pt-32 text-white sm:pb-16 sm:pt-40">
        <div className="shell max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime">
            AIAIAC 2027 · Call for abstracts
          </p>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Submit an Abstract
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/80">
            Share research, technical insights and practical experience with the AIAIAC programme
            team.
          </p>
          <p className="mt-6 border-t border-white/15 pt-5 text-sm font-semibold text-white/85">
            Deadline: {abstractSubmissionGuidance.deadline}, 23:59 West Africa Time · Maximum 500
            words
          </p>
        </div>
      </header>
      <section className="bg-[#F7F5EF] py-10 sm:py-14">
        <div className="shell max-w-4xl">
          {message && (
            <p
              className="mt-6 rounded-lg bg-slate-100 p-4 text-sm font-semibold text-slate-800"
              role={messageIsError ? "alert" : "status"}
            >
              {message}
            </p>
          )}
          <div className="mt-8">
            {access ? (
              <AuthorWorkspace access={access} />
            ) : (
              <form
                className="space-y-8 rounded-xl border border-slate-200 bg-white p-5 sm:p-8"
                aria-busy={state === "submitting"}
                onSubmit={(event) => void submit(event)}
              >
                <p className="text-sm leading-6 text-slate-600">
                  Complete your author details and abstract below. Required fields are marked with
                  an asterisk. Your submission will receive a reference for programme review.
                </p>
                <fieldset className="grid gap-5 sm:grid-cols-2">
                  <legend className="mb-4 font-display text-xl font-bold">
                    01 · Author and professional details
                  </legend>
                  {(
                    [
                      ["authorFirstName", "First name", "text"],
                      ["authorLastName", "Last name", "text"],
                      ["authorEmail", "Email", "email"],
                      ["authorPhone", "Phone", "tel"],
                      ["organizationName", "Organization / institution", "text"],
                      ["country", "Country", "text"],
                      ["jobTitle", "Job title (optional)", "text"],
                    ] as const
                  ).map(([name, label, type]) => (
                    <label className="text-sm font-bold text-slate-800" key={name}>
                      {label}
                      {name !== "jobTitle" && <span aria-hidden="true"> *</span>}
                      <input
                        autoComplete={
                          {
                            authorFirstName: "given-name",
                            authorLastName: "family-name",
                            authorEmail: "email",
                            authorPhone: "tel",
                            organizationName: "organization",
                            country: "country-name",
                            jobTitle: "organization-title",
                          }[name]
                        }
                        className={inputClass}
                        name={name}
                        type={type}
                        required={name !== "jobTitle"}
                        maxLength={
                          {
                            authorFirstName: 100,
                            authorLastName: 100,
                            authorEmail: 254,
                            authorPhone: 40,
                            organizationName: 200,
                            country: 100,
                            jobTitle: 150,
                          }[name]
                        }
                        minLength={
                          {
                            authorFirstName: 1,
                            authorLastName: 1,
                            authorEmail: 1,
                            authorPhone: 5,
                            organizationName: 2,
                            country: 2,
                            jobTitle: 0,
                          }[name]
                        }
                      />
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend className="mb-4 font-display text-xl font-bold">
                    02 · Abstract content
                  </legend>
                  <p className="mb-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    Document uploads are currently unavailable. Enter your abstract below.
                  </p>
                  <ContentFields value={content} onChange={setContent} />
                </fieldset>
                <label className="flex items-start gap-3 border-t border-slate-200 pt-6 text-sm leading-6 text-slate-700">
                  <input
                    className="mt-1 size-4 shrink-0 accent-forest"
                    name="consent"
                    type="checkbox"
                    required
                  />
                  <span>
                    I confirm this submission is my work and may be reviewed by the AIAIAC 2027
                    programme team.
                  </span>
                </label>
                <button
                  className="min-h-12 w-full rounded-md bg-forest px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-mineral focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest disabled:opacity-50 sm:w-auto"
                  disabled={state !== "ready" || countAbstractWords(content.abstractBody) > 500}
                  type="submit"
                >
                  {state === "submitting" ? "Submitting…" : "Submit Abstract"}
                </button>
                {state === "submitting" && (
                  <p role="status" className="text-sm text-slate-600">
                    Submitting your abstract…
                  </p>
                )}
              </form>
            )}
          </div>
          <section className="mt-10 rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
            <h2 className="font-display text-xl font-bold">Return to your Abstract</h2>
            <p className="mt-2 text-sm text-slate-600">
              Enter your reference and submission email to request a private access link. The link
              will be sent if your details match an existing submission.
            </p>
            <form
              className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
              onSubmit={(event) => void recover(event)}
            >
              <label className="text-sm font-bold">
                Reference
                <input
                  className={inputClass}
                  maxLength={19}
                  autoComplete="off"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  required
                />
              </label>
              <label className="text-sm font-bold">
                Submission email
                <input
                  className={inputClass}
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <button
                className="self-end rounded-lg border border-forest px-4 py-3 text-sm font-bold text-forest disabled:opacity-50"
                disabled={state !== "ready"}
                type="submit"
              >
                Email secure link
              </button>
            </form>
          </section>
          <Link
            className="mt-6 inline-block text-sm font-bold text-forest hover:underline"
            to="/conferences"
          >
            ← Conference programme
          </Link>
        </div>
      </section>
    </PublicPageLayout>
  );
}
