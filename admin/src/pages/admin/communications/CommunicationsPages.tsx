import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { Mail, Monitor, Smartphone } from "@/components/admin/adminIcons";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  communicationService,
  requiresCampaignConsent,
  isEventParticipantAudience,
  type Audience,
  type AudienceCode,
  type Campaign,
  type CampaignContent,
  type CampaignPurpose,
  type Delivery,
  type Preset,
} from "@/services/communication/communicationService";

const field =
  "block min-h-11 w-full rounded-[10px] border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1C2430] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#173D2D]/20 dark:focus:ring-[#34D399]/25";
const button =
  "min-h-11 rounded-[10px] bg-[#173D2D] dark:bg-[#15803D] px-[18px] py-2 text-sm font-semibold text-white transition-colors hover:bg-[#102C20] dark:hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-50 shadow-xs";
const secondary =
  "min-h-11 rounded-[10px] border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1C2430] px-[18px] py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-[#222C3A] disabled:opacity-50";
const card =
  "rounded-[14px] border border-slate-200 dark:border-[#26303E] bg-white dark:bg-[#151B23] p-5 shadow-xs";
const format = (value: string | null) => (value ? new Date(value).toLocaleString("en-GB") : "—");
const label = (value: string) => value.replaceAll("_", " ");
const purposeLabels: Record<CampaignPurpose, string> = {
  ESSENTIAL_EVENT_UPDATE: "Event update — existing conference participants",
  EVENT_ANNOUNCEMENT: "Marketing and invitations",
  DELEGATE_UPDATE: "Delegate updates",
  SPONSOR_OUTREACH: "Sponsor outreach",
  EXHIBITOR_OUTREACH: "Exhibitor outreach",
  MARKETING: "General marketing",
  PAYMENT_REMINDER: "Payment reminders",
};
const purposeAudience: Record<CampaignPurpose, Audience> = {
  ESSENTIAL_EVENT_UPDATE: { code: "ALL_CONTACTS" },
  EVENT_ANNOUNCEMENT: { code: "ALL_CONTACTS" },
  MARKETING: { code: "ALL_CONTACTS" },
  DELEGATE_UPDATE: { code: "ALL_DELEGATE_CONTACTS" },
  SPONSOR_OUTREACH: { code: "ALL_SPONSOR_CONTACTS" },
  EXHIBITOR_OUTREACH: { code: "ALL_EXHIBITOR_CONTACTS" },
  PAYMENT_REMINDER: { code: "ALL_DELEGATES", paymentStatus: "UNPAID" },
};
const audiences: { code: AudienceCode; label: string; group: string }[] = [
  { code: "ALL_CONTACTS", label: "All platform contacts", group: "All contacts" },
  {
    code: "ALL_DELEGATE_CONTACTS",
    label: "All delegate contacts — registered and prospective",
    group: "Delegates",
  },
  { code: "ALL_DELEGATES", label: "Registered delegates only", group: "Delegates" },
  {
    code: "PROFESSIONAL_DELEGATES",
    label: "Registered Professional Delegates",
    group: "Delegates",
  },
  { code: "STUDENT_DELEGATES", label: "Registered Student Delegates", group: "Delegates" },
  {
    code: "PROSPECTIVE_DELEGATES",
    label: "Prospective delegates — contacts only",
    group: "Delegates",
  },
  {
    code: "ALL_SPONSOR_CONTACTS",
    label: "All sponsor contacts — applications and prospective",
    group: "Sponsors",
  },
  { code: "SPONSORS", label: "Sponsor applications only", group: "Sponsors" },
  { code: "CONFIRMED_SPONSORS", label: "Confirmed sponsors only", group: "Sponsors" },
  {
    code: "PROSPECTIVE_SPONSORS",
    label: "Prospective sponsors — contacts only",
    group: "Sponsors",
  },
  {
    code: "ALL_EXHIBITOR_CONTACTS",
    label: "All exhibitor contacts — applications and prospective",
    group: "Exhibitors",
  },
  { code: "EXHIBITORS", label: "Exhibitor applications only", group: "Exhibitors" },
  { code: "CONFIRMED_EXHIBITORS", label: "Confirmed exhibitors only", group: "Exhibitors" },
  {
    code: "PROSPECTIVE_EXHIBITORS",
    label: "Prospective exhibitors — contacts only",
    group: "Exhibitors",
  },
  { code: "ABSTRACT_AUTHORS", label: "Abstract authors", group: "Other contacts" },
  {
    code: "APPROVED_CONTACTS",
    label: "Active manual and imported contacts",
    group: "Other contacts",
  },
];
const emptyContent: CampaignContent = {
  purpose: "EVENT_ANNOUNCEMENT",
  title: "",
  subject: "",
  preheader: "",
  heading: "",
  body: "",
  ctaLabel: null,
  ctaUrl: null,
  audience: { code: "ALL_CONTACTS" },
};
type Count = Awaited<ReturnType<typeof communicationService.count>>;

function Notice({ error, message }: { error: string; message: string }) {
  return (
    <>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
          {message}
        </p>
      )}
    </>
  );
}

function AudienceFields({
  audience,
  onChange,
  purpose = "MARKETING",
}: {
  audience: Audience;
  onChange: (value: Audience) => void;
  purpose?: CampaignPurpose;
}) {
  const delegate = ["ALL_DELEGATES", "PROFESSIONAL_DELEGATES", "STUDENT_DELEGATES"].includes(
    audience.code,
  );
  const change = (key: keyof Audience, value: string) =>
    onChange({
      ...audience,
      [key]: value || undefined,
      ...(key === "paymentStatus" && ["UNPAID", "ABANDONED"].includes(value)
        ? { currency: undefined }
        : {}),
    });
  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Audience
          <select
            className={cn(field, "mt-1")}
            value={audience.code}
            onChange={(event) =>
              onChange({
                code: event.target.value as AudienceCode,
                ...(purpose === "PAYMENT_REMINDER"
                  ? { paymentStatus: audience.paymentStatus ?? "UNPAID" }
                  : {}),
              })
            }
          >
            {["All contacts", "Delegates", "Sponsors", "Exhibitors", "Other contacts"].map(
              (group) => (
                <optgroup key={group} label={group}>
                  {audiences
                    .filter((item) => item.group === group)
                    .map((item) => (
                      <option
                        key={item.code}
                        value={item.code}
                        disabled={
                          (purpose === "ESSENTIAL_EVENT_UPDATE" &&
                            !isEventParticipantAudience(item.code)) ||
                          (purpose === "PAYMENT_REMINDER" &&
                            ![
                              "ALL_DELEGATES",
                              "PROFESSIONAL_DELEGATES",
                              "STUDENT_DELEGATES",
                            ].includes(item.code))
                        }
                      >
                        {purpose === "ESSENTIAL_EVENT_UPDATE" && item.code === "ALL_CONTACTS"
                          ? "Everyone involved in the conference"
                          : item.label}
                      </option>
                    ))}
                </optgroup>
              ),
            )}
          </select>
        </label>
      </div>

      {delegate && (
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-[#26303E] dark:bg-[#1C2430]/70">
          <p className="mb-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Optional delegate filters (leave set to &ldquo;Any&rdquo; to include everyone in this group)
          </p>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Registration status
              <select
                className={cn(field, "mt-1")}
                value={audience.registrationStatus ?? ""}
                onChange={(event) => change("registrationStatus", event.target.value)}
              >
                {["", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"].map(
                  (value) => (
                    <option key={value} value={value}>
                      {value ? label(value) : "Any"}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Payment status
              <select
                className={cn(field, "mt-1")}
                value={audience.paymentStatus ?? ""}
                onChange={(event) => change("paymentStatus", event.target.value)}
              >
                {(purpose === "PAYMENT_REMINDER"
                  ? ["UNPAID", "ABANDONED"]
                  : ["", "UNPAID", "ABANDONED", "PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"]
                ).map((value) => (
                  <option key={value} value={value}>
                    {value ? label(value) : "Any"}
                  </option>
                ))}
              </select>
            </label>
            {(audience.code === "STUDENT_DELEGATES" || audience.code === "ALL_DELEGATES") && (
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Student verification
                <select
                  className={cn(field, "mt-1")}
                  value={audience.verificationStatus ?? ""}
                  onChange={(event) => change("verificationStatus", event.target.value)}
                >
                  {[
                    "",
                    "NOT_SUBMITTED",
                    "PENDING",
                    "MORE_INFORMATION_REQUIRED",
                    "APPROVED",
                    "REJECTED",
                  ].map((value) => (
                    <option key={value} value={value}>
                      {value ? label(value) : "Any"}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Country
              <input
                className={cn(field, "mt-1")}
                value={audience.country ?? ""}
                maxLength={100}
                onChange={(event) => change("country", event.target.value)}
                placeholder="e.g. Nigeria"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Paid currency
              <select
                className={cn(field, "mt-1")}
                value={audience.currency ?? ""}
                disabled={["UNPAID", "ABANDONED"].includes(audience.paymentStatus ?? "")}
                onChange={(event) => change("currency", event.target.value)}
              >
                <option value="">Any</option>
                <option value="NGN">NGN</option>
                <option value="USD">USD</option>
              </select>
            </label>
          </div>
        </div>
      )}
      {audience.code === "ABSTRACT_AUTHORS" && (
        <div className="max-w-xs">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Abstract status
            <select
              className={cn(field, "mt-1")}
              value={audience.abstractStatus ?? ""}
              onChange={(event) => change("abstractStatus", event.target.value)}
            >
              {["", "SUBMITTED", "UNDER_REVIEW", "REVISION_REQUIRED", "ACCEPTED", "REJECTED"].map(
                (value) => (
                  <option key={value} value={value}>
                    {value ? label(value) : "Any"}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

export function EmailCentrePage() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [content, setContent] = useState<CampaignContent>(emptyContent);
  const [saved, setSaved] = useState<Campaign | null>(null);
  const [dirty, setDirty] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [count, setCount] = useState<Count | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [review, setReview] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [deviceView, setDeviceView] = useState<"desktop" | "mobile">("desktop");
  const [scheduledAt, setScheduledAt] = useState("");
  const [settings, setSettings] = useState<Awaited<
    ReturnType<typeof communicationService.settings>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canCreate = admin?.permissions.includes("communications.create");
  const canSend = admin?.permissions.includes("communications.send");
  const canManage = admin?.permissions.includes("communications.manage");
  const legacyAudiences: AudienceCode[] = [
    "ALL_DELEGATES",
    "PROFESSIONAL_DELEGATES",
    "STUDENT_DELEGATES",
    "SPONSORS",
    "CONFIRMED_SPONSORS",
    "EXHIBITORS",
    "CONFIRMED_EXHIBITORS",
    "ABSTRACT_AUTHORS",
    "APPROVED_CONTACTS",
  ];
  const unsupportedSelection = Boolean(
    settings &&
    (!(settings.supportedAudiences ?? legacyAudiences).includes(content.audience.code) ||
      !(settings.supportedPurposes ?? ["MARKETING", "PAYMENT_REMINDER"]).includes(
        content.purpose ?? "MARKETING",
      )),
  );

  useEffect(() => {
    let active = true;
    setPreviewError("");
    if (unsupportedSelection) {
      setPreview(null);
      setPreviewError("This campaign type needs the matching backend release before previewing.");
      return;
    }
    if (
      content.subject.trim().length < 3 ||
      content.heading.trim().length < 3 ||
      content.body.trim().length < 10
    )
      return;
    const timer = window.setTimeout(() => {
      void communicationService
        .preview(content)
        .then((result) => {
          if (active) setPreview(result.html);
        })
        .catch((failure: unknown) => {
          if (active)
            setPreviewError(
              failure instanceof Error
                ? failure.message
                : "Preview could not be loaded. Try Preview email again.",
            );
        });
    }, 500);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [content, unsupportedSelection]);
  useEffect(() => {
    communicationService
      .settings()
      .then(setSettings)
      .catch(() =>
        setError(
          "Sending settings could not be loaded. Check that the API supports the current Email Centre version. Sending remains unavailable until settings are verified; drafts and previews are still available.",
        ),
      );
    const draft = searchParams.get("draft");
    const presetParam = searchParams.get("preset");
    communicationService
      .presets()
      .then((loadedPresets) => {
        setPresets(loadedPresets);
        if (!draft && presetParam) {
          const matched = loadedPresets.find((item) => item.id === presetParam);
          if (matched) {
            setContent((prev) => ({
              ...prev,
              title: prev.title.trim() ? prev.title : matched.label,
              heading: matched.heading,
              body: matched.body,
              subject: matched.label,
              preheader: `${matched.label} — AIAIAC Africa 2027`,
            }));
          }
        }
      })
      .catch(() => {});
    if (draft)
      communicationService
        .get(draft)
        .then((campaign) => {
          if (campaign.status !== "DRAFT") return;
          setSaved(campaign);
          setContent({
            purpose: campaign.purpose ?? "MARKETING",
            title: campaign.title,
            subject: campaign.subject,
            preheader: campaign.preheader,
            heading: campaign.heading,
            body: campaign.body,
            ctaLabel: campaign.ctaLabel ?? null,
            ctaUrl: campaign.ctaUrl ?? null,
            audience: campaign.audience,
          });
        })
        .catch(() => setError("Draft could not be loaded."));
  }, [searchParams]);
  const changed = (next: CampaignContent) => {
    setContent(next);
    setDirty(true);
    setCount(null);
    setPreview(null);
    setReview(false);
    setAcknowledged(false);
  };
  const run = async (work: () => Promise<void>) => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await work();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Communications"
        title="Email Centre"
        description="Write a conference email, choose who should receive it, preview how it looks, and confirm before sending."
      />
      <Notice error={error} message={message} />
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Choose your message type and audience, write your email, then review recipients and send.
        Test emails are optional. View sent campaigns under Campaigns and delivery results under
        Delivery Activity.
      </p>
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-[#29352D] dark:bg-[#151F19] dark:text-slate-300">
        <p>
          Event updates reach verified delegates and active sponsor, exhibitor and abstract records.
          Marketing includes imported prospects with recorded opt-in. Duplicate emails are counted
          once; unsubscribed, suppressed and rejected/cancelled participant records are excluded.
        </p>
        <Link
          className="mt-2 inline-flex font-semibold text-[#173D2D] dark:text-[#CFEA3B] underline"
          to="/admin/communications/contacts"
        >
          Manage categories in Contacts &amp; Audiences
        </Link>
      </div>
      {(!settings ||
        !settings.bulkSendEnabled ||
        !settings.providerConfigured ||
        (requiresCampaignConsent(content.purpose) && !settings.marketingConfigured)) && (
        <p role="status" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          {!settings
            ? "Sending settings are not verified. Drafts and previews remain available."
            : !settings.bulkSendEnabled
              ? "Campaign delivery is disabled on the server. Drafts and previews remain available."
              : !settings.providerConfigured
                ? "Mailjet is not configured. Drafts and previews remain available."
                : "This campaign purpose requires configured unsubscribe protection. Sending remains unavailable."}
        </p>
      )}
      {unsupportedSelection && (
        <p role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          The deployed API does not support this purpose or audience. Deploy the matching backend
          release before counting or sending.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Step 1 + Step 2 (7 cols) */}
        <div className="min-w-0 space-y-6 lg:col-span-7">
          <section className={card}>
            <div className="mb-4 border-b border-slate-100 pb-3 dark:border-[#26303E]">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#173D2D] dark:bg-emerald-950/50 dark:text-[#34D399]">
                Step 1 of 4
              </span>
              <h2 className="mt-1.5 text-lg font-bold text-slate-900 dark:text-slate-100">
                Step 1: Choose who will receive the email
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Select why you are sending this email and pick the group of people who should receive it.
              </p>
            </div>
            <label className="mb-4 block max-w-md text-sm font-semibold text-slate-700 dark:text-slate-300">
              Campaign purpose
              <select
                className={cn(field, "mt-1")}
                value={content.purpose ?? "MARKETING"}
                onChange={(event) => {
                  const purpose = event.target.value as CampaignPurpose;
                  changed({ ...content, purpose, audience: { ...purposeAudience[purpose] } });
                }}
              >
                {Object.entries(purposeLabels)
                  .filter(
                    ([code]) =>
                      ["ESSENTIAL_EVENT_UPDATE", "EVENT_ANNOUNCEMENT", "PAYMENT_REMINDER"].includes(
                        code,
                      ) || code === content.purpose,
                  )
                  .map(([code, title]) => (
                    <option key={code} value={code}>
                      {title}
                    </option>
                  ))}
              </select>
            </label>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              Suppressed and opted-out addresses are excluded automatically. Payment and consent
              eligibility are checked again before each send.
            </p>
            <AudienceFields
              audience={content.audience}
              purpose={content.purpose ?? "MARKETING"}
              onChange={(audience) => changed({ ...content, audience })}
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                className={secondary}
                disabled={busy || unsupportedSelection}
                onClick={() =>
                  void run(async () => {
                    const result = await communicationService.count({
                      ...content.audience,
                      purpose: content.purpose ?? "MARKETING",
                    });
                    setCount(result);
                  })
                }
              >
                Review audience
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Check how many people match your selection before sending
              </span>
            </div>
            {count && (
              <div
                className="mt-4 space-y-3 rounded-xl border border-[#BDE3CC] bg-[#EAF5EF]/70 p-4 text-sm text-slate-800 dark:border-[#10B981]/30 dark:bg-[#064E3B]/25 dark:text-slate-200"
                role="status"
              >
                {count.totalContacts !== undefined && (
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {count.totalContacts} contacts in this audience
                  </p>
                )}
                <p>
                  <strong className="text-lg font-extrabold text-[#065F46] dark:text-[#34D399]">
                    {count.count}
                  </strong>{" "}
                  recipients can receive this campaign
                </p>
                {count.totalContacts === undefined && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Update the backend to show the total number of stored contacts in this audience.
                  </p>
                )}
                {(count.excludedNoConsent !== undefined ||
                  count.excludedOptedOut !== undefined ||
                  count.excludedSuppressed !== undefined) && (
                  <dl className="grid gap-2 text-xs sm:grid-cols-3">
                    {count.excludedNoConsent !== undefined && (
                      <div>
                        <dt>Missing recorded opt-in</dt>
                        <dd className="mt-1 font-bold">{count.excludedNoConsent}</dd>
                      </div>
                    )}
                    {count.excludedOptedOut !== undefined && (
                      <div>
                        <dt>Unsubscribed</dt>
                        <dd className="mt-1 font-bold">{count.excludedOptedOut}</dd>
                      </div>
                    )}
                    {count.excludedSuppressed !== undefined && (
                      <div>
                        <dt>Suppressed</dt>
                        <dd className="mt-1 font-bold">{count.excludedSuppressed}</dd>
                      </div>
                    )}
                  </dl>
                )}
                {count.totalContacts !== undefined &&
                  count.totalContacts > 0 &&
                  count.count === 0 && (
                    <p>
                      Contacts are present, but none meet the sending requirements for this
                      campaign. Review their records and recorded consent in{" "}
                      <Link className="font-semibold underline" to="/admin/communications/contacts">
                        Contacts &amp; Audiences
                      </Link>
                      .
                    </p>
                  )}
                {count.overLimit && <p>This exceeds the {count.limit}-recipient campaign limit.</p>}
              </div>
            )}
            {count?.recipients && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                  Review campaign recipients
                </summary>
                <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-[#26303E]">
                  <table className="mt-2 w-full text-left">
                    <thead className="bg-slate-50 text-slate-700 dark:bg-[#1C2430] dark:text-slate-300">
                      <tr>
                        <th className="p-2">Name</th>
                        <th>Email</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#26303E]">
                      {count.recipients.map((person) => (
                        <tr
                          key={person.email}
                          className="hover:bg-slate-50/50 dark:hover:bg-[#1C2430]/60"
                        >
                          <td className="p-2 font-medium">{person.name}</td>
                          <td className="text-slate-600 dark:text-slate-400">{person.email}</td>
                          <td className="text-slate-600 dark:text-slate-400">
                            {label(person.sourceCategory)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </section>

          <section className={card}>
            <div className="mb-4 border-b border-slate-100 pb-3 dark:border-[#26303E]">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#173D2D] dark:bg-emerald-950/50 dark:text-[#34D399]">
                Step 2 of 4
              </span>
              <h2 className="mt-1.5 text-lg font-bold text-slate-900 dark:text-slate-100">
                Step 2: Write or choose the email
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Pick a starting template to pre-fill the message, or write your own email from scratch.
              </p>
            </div>
            <label className="mb-4 block max-w-md text-sm font-semibold text-slate-700 dark:text-slate-300">
              Starting template
              <select
                className={cn(field, "mt-1")}
                defaultValue={searchParams.get("preset") ?? ""}
                onChange={(event) => {
                  const preset = presets.find((item) => item.id === event.target.value);
                  if (preset)
                    changed({
                      ...content,
                      title: content.title.trim() ? content.title : preset.label,
                      heading: preset.heading,
                      body: preset.body,
                      subject: preset.label,
                      preheader: `${preset.label} — AIAIAC Africa 2027`,
                    });
                }}
              >
                <option value="">Choose a preset (optional)</option>
                {presets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Internal campaign name
                <input
                  className={cn(field, "mt-1")}
                  value={content.title}
                  maxLength={120}
                  placeholder="e.g. April Delegate Update (staff only)"
                  onChange={(event) => changed({ ...content, title: event.target.value })}
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Email subject
                <input
                  className={cn(field, "mt-1")}
                  value={content.subject}
                  maxLength={180}
                  placeholder="Subject line seen in the recipient's inbox"
                  onChange={(event) => changed({ ...content, subject: event.target.value })}
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2 dark:text-slate-300">
                Email heading
                <input
                  className={cn(field, "mt-1")}
                  value={content.heading}
                  maxLength={180}
                  placeholder="Main headline shown at the top of the email"
                  onChange={(event) => changed({ ...content, heading: event.target.value })}
                />
              </label>
            </div>
            <label className="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Message
              <textarea
                className={`${field} mt-1 min-h-44`}
                maxLength={5000}
                placeholder="Write the main body of your email here..."
                value={content.body}
                onChange={(event) => changed({ ...content, body: event.target.value })}
              />
            </label>

            <div className="mt-4 rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-[#26303E] dark:bg-[#1C2430]/70">
              <p className="mb-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Optional inbox preview text &amp; button link
              </p>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700 sm:col-span-2 dark:text-slate-300">
                  Preheader
                  <input
                    className={cn(field, "mt-1")}
                    value={content.preheader}
                    maxLength={180}
                    placeholder="Short summary shown next to the subject line in the inbox (optional)"
                    onChange={(event) => changed({ ...content, preheader: event.target.value })}
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  CTA label (optional)
                  <input
                    className={cn(field, "mt-1")}
                    maxLength={80}
                    placeholder="e.g. Complete registration"
                    value={content.ctaLabel ?? ""}
                    onChange={(event) =>
                      changed({ ...content, ctaLabel: event.target.value || null })
                    }
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  CTA HTTPS URL (optional)
                  <input
                    className={cn(field, "mt-1")}
                    type="url"
                    maxLength={500}
                    placeholder="https://aiaiac.org/..."
                    value={content.ctaUrl ?? ""}
                    onChange={(event) =>
                      changed({ ...content, ctaUrl: event.target.value || null })
                    }
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className={secondary}
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const result = await communicationService.preview(content);
                    setPreview(result.html);
                  })
                }
              >
                Preview email
              </button>
              {canCreate && (
                <button
                  className={button}
                  disabled={busy || Boolean(saved && !canManage)}
                  onClick={() =>
                    void run(async () => {
                      const campaign = saved
                        ? await communicationService.update(saved.reference, content)
                        : await communicationService.create(content);
                      setSaved(campaign);
                      setDirty(false);
                      setMessage(`Draft ${campaign.reference} saved.`);
                    })
                  }
                >
                  {saved ? "Update draft" : "Save draft"}
                </button>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Step 3 (Preview) + Step 4 (Confirm and send) (5 cols) */}
        <div className="min-w-0 space-y-6 lg:col-span-5 lg:sticky lg:top-20 lg:self-start">
          <section className={card}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3 dark:border-[#26303E]">
              <div className="min-w-0">
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#173D2D] dark:bg-emerald-950/50 dark:text-[#34D399]">
                  Step 3 of 4
                </span>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="shrink-0 text-base select-none" aria-hidden="true">
                    👁️
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Step 3: Preview and check the message
                  </h2>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {content.subject || "Switch between Desktop and Mobile views below"}
                </p>
              </div>
              <div className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-[#26303E] dark:bg-[#0D1117]">
                <button
                  type="button"
                  onClick={() => setDeviceView("desktop")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                    deviceView === "desktop"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-[#1C2430] dark:text-[#34D399]"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400",
                  )}
                  title="Desktop preview"
                >
                  <span className="text-xs select-none" aria-hidden="true">
                    💻
                  </span>
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceView("mobile")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                    deviceView === "mobile"
                      ? "bg-white text-slate-900 shadow-xs dark:bg-[#1C2430] dark:text-[#34D399]"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400",
                  )}
                  title="Mobile preview"
                >
                  <span className="text-xs select-none" aria-hidden="true">
                    📱
                  </span>
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            {preview ? (
              <div className="rounded-xl border border-slate-200 bg-slate-100 p-2 dark:border-[#26303E] dark:bg-[#0D1117]">
                <div
                  className={cn(
                    "mx-auto transition-all duration-200",
                    deviceView === "mobile" ? "max-w-[360px]" : "w-full",
                  )}
                >
                  <iframe
                    title="Campaign email preview"
                    sandbox=""
                    srcDoc={preview}
                    className="h-[520px] w-full rounded-lg border border-slate-200 bg-white dark:border-[#26303E]"
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-[#26303E] dark:bg-[#0D1117]/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-[#1C2430] dark:text-[#34D399]">
                  <Mail className="h-6 w-6 stroke-[1.4]" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {previewError || "Enter an email subject, heading and message"}
                </p>
                <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                  Your branded email preview updates automatically once you type a subject, heading,
                  and message.
                </p>
              </div>
            )}
          </section>

          <section className={card}>
            <div className="mb-3 border-b border-slate-100 pb-3 dark:border-[#26303E]">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#173D2D] dark:bg-emerald-950/50 dark:text-[#34D399]">
                Step 4 of 4
              </span>
              <h2 className="mt-1.5 text-lg font-bold text-slate-900 dark:text-slate-100">
                Step 4: Confirm and send
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Review saves your latest draft and checks eligible recipients. Nothing is sent until
              you acknowledge the final confirmation and choose Send.
            </p>
            <button
              className={`${button} mt-4 w-full`}
              disabled={
                busy ||
                unsupportedSelection ||
                !canSend ||
                (!saved && !canCreate) ||
                Boolean(saved && dirty && !canManage)
              }
              type="button"
              onClick={() =>
                void run(async () => {
                  setReview(false);
                  setAcknowledged(false);
                  const campaign =
                    !saved || dirty
                      ? saved
                        ? await communicationService.update(saved.reference, content)
                        : await communicationService.create(content)
                      : saved;
                  setSaved(campaign);
                  setDirty(false);
                  const fresh = await communicationService.count({
                    ...content.audience,
                    purpose: content.purpose ?? "MARKETING",
                  });
                  setCount(fresh);
                  if (fresh.count === 0)
                    throw new Error(
                      fresh.totalContacts && fresh.totalContacts > 0
                        ? "Contacts are present, but none meet the sending requirements for this campaign. Review records and recorded consent in Contacts & Audiences."
                        : "No recipients can receive this campaign. Review the audience, recorded consent and suppression settings.",
                    );
                  if (fresh.overLimit)
                    throw new Error(
                      `This audience exceeds the ${fresh.limit}-recipient campaign limit. Narrow your audience before sending.`,
                    );
                  setReview(true);
                })
              }
            >
              Review recipients and send
            </button>
            {!canSend && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                You do not have permission to send campaigns.
              </p>
            )}
          </section>
          {saved && (
            <section className={card}>
              <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">
                Campaign review &amp; optional test
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Draft {saved.reference}. Sending a test email is optional and sends a copy to one
                address before you send to everyone.
              </p>
              {canSend && (
                <details className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-[#26303E] dark:bg-[#1C2430]/70">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Optional: send one test email
                  </summary>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      aria-label="Test email address"
                      className={`${field} max-w-sm`}
                      type="email"
                      value={testEmail}
                      onChange={(event) => setTestEmail(event.target.value)}
                      placeholder="test@example.com"
                    />
                    <button
                      className={secondary}
                      disabled={busy || dirty || !testEmail}
                      onClick={() =>
                        void run(async () => {
                          await communicationService.test(saved.reference, testEmail);
                          setMessage("Test email accepted by provider.");
                        })
                      }
                    >
                      Send one test email
                    </button>
                  </div>
                </details>
              )}
              {dirty && (
                <p className="mt-2 text-sm text-amber-800 dark:text-amber-400">
                  Save the latest edits before final review.
                </p>
              )}
              <label className="mt-4 block max-w-sm text-sm font-semibold text-slate-700 dark:text-slate-300">
                Schedule (optional, your local time)
                <input
                  className={cn(field, "mt-1")}
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => {
                    setScheduledAt(event.target.value);
                    setReview(false);
                    setAcknowledged(false);
                  }}
                />
              </label>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Up to 500 recipients per campaign. Scheduled emails can be cancelled at any time
                before their scheduled send time.
              </p>
              {settings &&
                (!settings.bulkSendEnabled ||
                  !settings.providerConfigured ||
                  (requiresCampaignConsent(content.purpose) && !settings.marketingConfigured)) && (
                  <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    {!settings.bulkSendEnabled
                      ? "Campaign delivery is disabled on the server. Drafts and previews remain available."
                      : !settings.providerConfigured
                        ? "Mailjet is not configured. Drafts and previews remain available."
                        : "Marketing sending requires the HTTPS unsubscribe endpoint and signing secret. For unpaid-registration reminders, select Payment reminder as the campaign purpose."}
                  </p>
                )}
              {review && count && (
                <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
                  <h3 className="font-bold">Final confirmation</h3>
                  <p className="mt-1">
                    {saved.subject} will be sent to {count.count} distinct{" "}
                    {(
                      audiences.find((audience) => audience.code === saved.audience.code)?.label ??
                      label(saved.audience.code)
                    ).toLowerCase()}{" "}
                    addresses. This cannot be undone after delivery starts.
                  </p>
                  <label className="mt-3 flex items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(event) => setAcknowledged(event.target.checked)}
                    />
                    I have reviewed the message, recipients and campaign purpose.
                  </label>
                  <button
                    className={`${button} mt-3 w-full sm:w-auto`}
                    disabled={
                      busy ||
                      !acknowledged ||
                      unsupportedSelection ||
                      !canSend ||
                      dirty ||
                      count.count === 0 ||
                      count.overLimit ||
                      !settings?.bulkSendEnabled ||
                      !settings.providerConfigured ||
                      (requiresCampaignConsent(content.purpose) && !settings.marketingConfigured)
                    }
                    onClick={() =>
                      void run(async () => {
                        const campaign = await communicationService.confirm(
                          saved.reference,
                          count.fingerprint,
                          saved.revision ?? 1,
                          scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
                        );
                        navigate(`/admin/communications/campaigns/${campaign.reference}`);
                      })
                    }
                  >
                    {scheduledAt
                      ? "Schedule email to selected recipients"
                      : `Send to ${count.count} selected recipients`}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export function CampaignsPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    communicationService
      .list(page, status)
      .then((result) => {
        if (active) {
          setItems(result.items);
          setTotal(result.total);
          setLoading(false);
        }
      })
      .catch((failure) => {
        if (active) {
          setError(String(failure));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [page, status]);
  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Communications"
        title="Campaigns"
        description="Saved email drafts and sent campaign history."
        actions={
          <Link className={button} to="/admin/communications">
            New email
          </Link>
        }
      />
      <Notice error={error} message="" />
      <label className="block max-w-xs text-sm font-semibold text-slate-700 dark:text-slate-200">
        Status{" "}
        <select
          className={cn(field, "mt-1")}
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
        >
          {[
            "",
            "DRAFT",
            "SCHEDULED",
            "CANCELLED",
            "SENDING",
            "SENT",
            "PARTIALLY_FAILED",
            "FAILED",
          ].map((value) => (
            <option key={value} value={value}>
              {value ? label(value) : "All statuses"}
            </option>
          ))}
        </select>
      </label>
      {loading ? (
        <p role="status">Loading campaigns…</p>
      ) : items.length === 0 ? (
        <p className={card}>No campaigns found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-[#26303E] dark:bg-[#151B23]">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-700 dark:bg-[#1C2430] dark:text-slate-200">
              <tr>
                {[
                  "Campaign",
                  "Subject",
                  "Purpose",
                  "Audience",
                  "Created by",
                  "Recipients",
                  "Sent",
                  "Failed",
                  "Status",
                  "Created",
                  "Sent time",
                ].map((name) => (
                  <th className="px-3 py-3 font-semibold" key={name}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#26303E]">
              {items.map((item) => (
                <tr className="hover:bg-slate-50/70 dark:hover:bg-[#1C2430]/60" key={item.id}>
                  <td className="px-3 py-3">
                    <Link
                      className="font-semibold text-emerald-800 underline dark:text-[#34D399]"
                      to={`/admin/communications/campaigns/${item.reference}`}
                    >
                      {item.title}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{item.subject}</td>
                  <td className="px-3 py-3">{purposeLabels[item.purpose ?? "MARKETING"]}</td>
                  <td className="px-3 py-3">
                    {audiences.find((audience) => audience.code === item.audience.code)?.label ??
                      label(item.audience.code)}
                  </td>
                  <td className="px-3 py-3">{item.createdBy}</td>
                  <td className="px-3 py-3">{item.recipientCount}</td>
                  <td className="px-3 py-3">{item.sent}</td>
                  <td className="px-3 py-3">{item.failed}</td>
                  <td className="px-3 py-3">
                    <AdminStatusBadge status={item.status} />
                  </td>
                  <td className="px-3 py-3">{format(item.createdAt)}</td>
                  <td className="px-3 py-3">{format(item.sentAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center gap-3 text-sm">
        <button className={secondary} disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {page} · {total} campaigns
        </span>
        <button
          className={secondary}
          disabled={page * 20 >= total}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function CampaignDetailPage() {
  const { reference } = useParams();
  const { admin } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    if (reference)
      communicationService
        .get(reference)
        .then(setCampaign)
        .catch((failure) => setError(String(failure)));
  }, [reference]);
  useEffect(() => {
    load();
  }, [load]);
  const send = async (retry: boolean) => {
    if (!reference || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let result = retry
        ? await communicationService.retry(reference)
        : await communicationService.deliver(reference);
      setCampaign(result.campaign);
      let batches = 1;
      while (result.processed > 0 && result.campaign.pending > 0 && batches < 50) {
        result = await communicationService.deliver(reference);
        setCampaign(result.campaign);
        batches++;
      }
      setMessage(
        `Delivery run processed ${batches} batch${batches === 1 ? "" : "es"}. Sent: ${result.campaign.sent}; failed: ${result.campaign.failed}.`,
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Delivery failed");
      load();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Communications / Campaigns"
        title={campaign?.title ?? "Campaign"}
        description={reference ?? ""}
        actions={
          <Link className={secondary} to="/admin/communications/campaigns">
            All campaigns
          </Link>
        }
      />
      <Notice error={error} message={message} />
      {!campaign ? (
        <p role="status">Loading campaign…</p>
      ) : (
        <>
          <section className={card}>
            <p>
              <strong>Status:</strong> {label(campaign.status)} · <strong>Audience:</strong>{" "}
              {label(campaign.audience.code)}
            </p>
            <p className="mt-2">
              <strong>Recipients:</strong> {campaign.recipientCount} · <strong>Sent:</strong>{" "}
              {campaign.sent} · <strong>Failed:</strong> {campaign.failed} ·{" "}
              <strong>Pending:</strong> {campaign.pending} · <strong>Claimed:</strong>{" "}
              {campaign.claimed}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Created by {campaign.createdBy} on {format(campaign.createdAt)}.
            </p>
            <p className="mt-2 text-sm">
              Purpose: {purposeLabels[campaign.purpose ?? "MARKETING"]} · Skipped:{" "}
              {campaign.skipped ?? 0} · Uncertain: {campaign.uncertain ?? 0}
              {campaign.scheduledAt ? ` · Scheduled: ${format(campaign.scheduledAt)}` : ""}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Sent counts provider acceptance. Delivery Activity shows subsequent delivery, bounce,
              complaint and unsubscribe events when tracking is configured.
            </p>
            {campaign.status === "SCHEDULED" &&
              admin?.permissions.includes("communications.manage") && (
                <button
                  className={`${secondary} mt-3`}
                  disabled={busy}
                  onClick={() => {
                    if (!reference) return;
                    setBusy(true);
                    void communicationService
                      .cancel(reference)
                      .then(setCampaign)
                      .catch((failure) => setError(String(failure)))
                      .finally(() => setBusy(false));
                  }}
                >
                  Cancel scheduled campaign
                </button>
              )}
            <h2 className="mt-5 text-lg font-bold">{campaign.subject}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm">{campaign.body}</p>
            {campaign.status === "DRAFT" && (
              <Link
                className={`${secondary} mt-4 inline-block`}
                to={`/admin/communications?draft=${campaign.reference}`}
              >
                Open draft in Email Centre
              </Link>
            )}
            {campaign.status !== "DRAFT" && (
              <div className="mt-5 flex flex-wrap gap-3">
                {admin?.permissions.includes("communications.send") &&
                  campaign.pending > 0 &&
                  campaign.status !== "SCHEDULED" &&
                  campaign.status !== "CANCELLED" && (
                    <button className={button} disabled={busy} onClick={() => void send(false)}>
                      {busy ? "Delivering…" : `Send to ${campaign.pending} pending recipients`}
                    </button>
                  )}
                {admin?.permissions.includes("communications.manage") &&
                  admin.permissions.includes("communications.send") &&
                  campaign.failed > (campaign.uncertain ?? 0) && (
                    <button className={secondary} disabled={busy} onClick={() => void send(true)}>
                      Retry failed recipients (max 3 attempts)
                    </button>
                  )}
                <Link
                  className={secondary}
                  to={`/admin/communications/deliveries?campaign=${campaign.reference}`}
                >
                  View delivery activity
                </Link>
              </div>
            )}
          </section>
          {(campaign.claimed > 0 || (campaign.uncertain ?? 0) > 0) && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Some deliveries remain claimed. Do not retry these automatically: their provider
              outcome may be uncertain after an interruption. Investigate before reconciliation.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function TemplatesPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    communicationService
      .presets()
      .then(setPresets)
      .catch((failure) => setError(String(failure)));
  }, []);
  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Communications"
        title="Templates"
        description="Suggested starting points for conference communications. Transactional payment, pass, security, and verification templates are not editable here."
      />
      <Notice error={error} message="" />
      <div className="grid gap-4 md:grid-cols-2">
        {presets.map((preset) => (
          <article className={card} key={preset.id}>
            <h2 className="font-bold text-slate-900 dark:text-slate-100">{preset.label}</h2>
            <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">{preset.heading}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{preset.body}</p>
            <Link
              className="mt-4 inline-flex items-center text-sm font-semibold text-emerald-800 underline dark:text-[#34D399]"
              to={`/admin/communications?preset=${encodeURIComponent(preset.id)}`}
            >
              Compose email
            </Link>
          </article>
        ))}
      </div>
      {!presets.length && !error && <p role="status">Loading templates…</p>}
    </div>
  );
}

export function DeliveryActivityPage() {
  const [items, setItems] = useState<Delivery[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [campaign, setCampaign] = useState(
    new URLSearchParams(window.location.search).get("campaign") ?? "",
  );
  const [campaignInput, setCampaignInput] = useState(campaign);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    communicationService
      .deliveries(page, status, campaign)
      .then((result) => {
        if (active) {
          setItems(result.items);
          setTotal(result.total);
          setLoading(false);
        }
      })
      .catch((failure) => {
        if (active) {
          setError(String(failure));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [page, status, campaign]);
  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Communications"
        title="Delivery Activity"
        description="Delivery status and retry history for each recipient."
      />
      <Notice error={error} message="" />
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Status
          <select
            className={cn(field, "mt-1")}
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            {["", "PENDING", "CLAIMED", "SENT", "FAILED", "SKIPPED", "UNCERTAIN"].map((value) => (
              <option key={value} value={value}>
                {value || "All"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Campaign reference
          <input
            className={cn(field, "mt-1")}
            value={campaignInput}
            onChange={(event) => setCampaignInput(event.target.value.toUpperCase())}
            placeholder="AIAIAC-COM-…"
          />
        </label>
        <button
          className={secondary}
          onClick={() => {
            if (campaignInput && !/^AIAIAC-COM-[A-F0-9]{8}$/.test(campaignInput)) {
              setError("Enter a complete campaign reference.");
              return;
            }
            setPage(1);
            setCampaign(campaignInput);
          }}
        >
          Apply filter
        </button>
      </div>
      {loading ? (
        <p role="status">Loading deliveries…</p>
      ) : items.length === 0 ? (
        <p className={card}>No delivery activity found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-[#26303E] dark:bg-[#151B23]">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-700 dark:bg-[#1C2430] dark:text-slate-200">
              <tr>
                {[
                  "Recipient",
                  "Campaign",
                  "Source",
                  "Status",
                  "Attempts",
                  "Provider reference",
                  "Delivery event",
                  "Error",
                  "Sent time",
                ].map((name) => (
                  <th className="px-3 py-3 font-semibold" key={name}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#26303E]">
              {items.map((item) => (
                <tr className="hover:bg-slate-50/70 dark:hover:bg-[#1C2430]/60" key={item.id}>
                  <td className="px-3 py-3">
                    {item.name}
                    <br />
                    <span className="text-slate-500 dark:text-slate-400">{item.email}</span>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      className="text-emerald-800 underline dark:text-[#34D399]"
                      to={`/admin/communications/campaigns/${item.campaignReference}`}
                    >
                      {item.campaignReference}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{label(item.sourceCategory)}</td>
                  <td className="px-3 py-3">
                    <AdminStatusBadge status={item.status} />
                  </td>
                  <td className="px-3 py-3">{item.attempts}</td>
                  <td className="px-3 py-3">{item.providerMessageId ?? "—"}</td>
                  <td className="px-3 py-3">{item.providerStatus ?? "Not reported"}</td>
                  <td className="px-3 py-3">{item.errorSummary ?? "—"}</td>
                  <td className="px-3 py-3">{format(item.sentAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center gap-3 text-sm">
        <button className={secondary} disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {page} · {total} deliveries
        </span>
        <button
          className={secondary}
          disabled={page * 20 >= total}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
