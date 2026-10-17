import { useCallback, useEffect, useRef, useState } from "react";
import { IconQrcode } from "@tabler/icons-react";
import {
  BadgeCheck,
  CircleAlert,
  Clock,
  RotateCw,
  Search,
  TicketCheck,
} from "@/components/admin/adminIcons";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAuth } from "@/hooks/useAuth";
import {
  confirmAttendeeCheckIn,
  getCheckInCount,
  getRecentCheckIns,
  lookupCheckInAttendee,
  validateEventPass,
  type CheckInConfirmation,
  type CheckInReview,
  type CheckInStatus,
  type RecentCheckIn,
} from "@/services/checkIn/checkInService";
import { EventPassScanner } from "./EventPassScanner";

const primaryButton =
  "flex min-h-12 items-center justify-center gap-2 rounded-[9px] bg-[#173D2D] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#102C20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "flex min-h-11 items-center justify-center gap-2 rounded-[9px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50";

const statusCopy: Record<CheckInStatus, { title: string; description: string; tone: string }> = {
  VALID_ACTIVE_PASS: {
    title: "Ready for check-in",
    description: "Review the attendee, then confirm their entry.",
    tone: "success",
  },
  CHECKED_IN: {
    title: "Checked in",
    description: "Entry confirmed. This attendee has been admitted.",
    tone: "success",
  },
  ALREADY_CHECKED_IN: {
    title: "Already checked in",
    description: "This attendee has an existing check-in record.",
    tone: "warning",
  },
  INVALID_PASS: {
    title: "Invalid Event Pass",
    description:
      "No matching pass was found. Try manual lookup or refer the attendee to registration support.",
    tone: "danger",
  },
  INACTIVE_PASS: {
    title: "Inactive Event Pass",
    description: "This pass is inactive or revoked. Refer the attendee to registration support.",
    tone: "danger",
  },
  REGISTRATION_NOT_ELIGIBLE: {
    title: "Registration not eligible",
    description:
      "Entry cannot be confirmed. Check the registration requirements with registration support.",
    tone: "danger",
  },
  RECONCILIATION_REQUIRED: {
    title: "Finance review required",
    description:
      "Payment needs reconciliation. Refer this attendee to Finance before confirming entry.",
    tone: "warning",
  },
};

function readable(value: string | null) {
  return value ? value.toLowerCase().replaceAll("_", " ") : "Not available";
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function AttendeeReview({
  review,
  canManage,
  saving,
  onConfirm,
}: {
  review: CheckInReview;
  canManage: boolean;
  saving: boolean;
  onConfirm: () => void;
}) {
  const copy = statusCopy[review.status];
  const attendee = review.attendee;
  const toneClass =
    copy.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : copy.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-red-200 bg-red-50 text-red-900";
  return (
    <section
      aria-label="Attendee review"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      <div role="status" data-tone={copy.tone} className={`flex gap-3 border-b p-4 ${toneClass}`}>
        {copy.tone === "success" ? (
          <BadgeCheck size={24} className="shrink-0" />
        ) : (
          <CircleAlert size={24} className="shrink-0" />
        )}
        <div>
          <h2 className="text-base font-bold">{copy.title}</h2>
          <p className="mt-1 text-sm leading-relaxed">{copy.description}</p>
          {review.checkedInAt ? (
            <p className="mt-2 text-sm font-semibold">{dateTime(review.checkedInAt)} WAT</p>
          ) : null}
        </div>
      </div>
      {attendee ? (
        <div className="p-5">
          <h3 className="break-words text-xl font-bold text-slate-900">{attendee.name}</h3>
          <p className="mt-1 break-all font-mono text-xs text-slate-500">
            {attendee.registrationReference}
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            {[
              ["Category", attendee.category],
              ["Email verification", attendee.emailVerificationStatus],
              ["Payment", attendee.paymentStatus],
              ["Event Pass", attendee.eventPassStatus],
              ...(attendee.category === "STUDENT"
                ? [["Student approval", attendee.studentVerificationStatus]]
                : []),
              ["Check-in", review.checkedInAt ? "CHECKED_IN" : "NOT_CHECKED_IN"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-1 font-semibold capitalize text-slate-800">
                  {readable(value ?? null)}
                </dd>
              </div>
            ))}
          </dl>
          {review.status === "VALID_ACTIVE_PASS" ? (
            <div className="mt-6 border-t border-slate-200 pt-4">
              {canManage ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={onConfirm}
                  className={`${primaryButton} w-full`}
                >
                  <BadgeCheck size={20} />
                  {saving ? "Confirming…" : "Confirm Check-in"}
                </button>
              ) : (
                <p className="text-sm text-slate-600">
                  You have view access. An authorized check-in staff member must confirm entry.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function CheckInPage() {
  const { admin } = useAuth();
  const canManage = admin?.permissions.includes("check_in.manage") ?? false;
  const [scannerOpen, setScannerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [review, setReview] = useState<CheckInReview | null>(null);
  const [matches, setMatches] = useState<CheckInReview[]>([]);
  const [busy, setBusy] = useState<"idle" | "lookup" | "validate" | "confirm">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentCheckIn[]>([]);
  const [count, setCount] = useState<{ today: number; total: number } | null>(null);
  const [activityState, setActivityState] = useState<"loading" | "ready" | "error">("loading");
  const confirmationRef = useRef<CheckInConfirmation | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  const loadActivity = useCallback(async () => {
    setActivityState("loading");
    const [recentResult, countResult] = await Promise.all([getRecentCheckIns(), getCheckInCount()]);
    if (!mountedRef.current) return;
    if (recentResult.ok) setRecent(recentResult.data.items);
    if (countResult.ok) setCount(countResult.data);
    setActivityState(recentResult.ok && countResult.ok ? "ready" : "error");
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadActivity();
    return () => {
      mountedRef.current = false;
      confirmationRef.current = null;
    };
  }, [loadActivity]);

  const resetReview = () => {
    confirmationRef.current = null;
    setReview(null);
    setMatches([]);
    setMessage(null);
  };

  const validateScan = async (credential: string) => {
    setScannerOpen(false);
    if (busyRef.current) return;
    busyRef.current = true;
    resetReview();
    setBusy("validate");
    const result = await validateEventPass(credential);
    if (mountedRef.current) {
      if (result.ok) {
        setReview(result.data);
        if (result.data.status === "VALID_ACTIVE_PASS")
          confirmationRef.current = { method: "QR", credential };
      } else setMessage(result.error);
      setBusy("idle");
    }
    busyRef.current = false;
  };

  const lookup = async () => {
    if (busyRef.current || !query.trim()) return;
    busyRef.current = true;
    resetReview();
    setBusy("lookup");
    const result = await lookupCheckInAttendee(query.trim());
    if (mountedRef.current) {
      if (!result.ok) setMessage(result.error);
      else if (!result.data.matches.length)
        setMessage("No attendee found. Check the reference or email and try again.");
      else if (result.data.matches.length === 1) selectMatch(result.data.matches[0]!);
      else setMatches(result.data.matches);
      setBusy("idle");
    }
    busyRef.current = false;
  };

  const selectMatch = (match: CheckInReview) => {
    setReview(match);
    setMatches([]);
    confirmationRef.current =
      match.status === "VALID_ACTIVE_PASS" && match.attendee
        ? { method: "MANUAL_LOOKUP", registrationReference: match.attendee.registrationReference }
        : null;
  };

  const confirm = async () => {
    const input = confirmationRef.current;
    if (!input || busyRef.current || !canManage) return;
    busyRef.current = true;
    setBusy("confirm");
    setMessage(null);
    const result = await confirmAttendeeCheckIn(input);
    if (mountedRef.current) {
      if (result.ok) {
        setReview(result.data);
        confirmationRef.current = null;
        void loadActivity();
      } else setMessage(result.error);
      setBusy("idle");
    }
    busyRef.current = false;
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Operations / Entry"
        title="Event Check-in"
        description="Scan an Event Pass or find an attendee, review their details, and confirm entry."
        actions={
          <div className="border-l-2 border-[#173D2D] pl-4">
            <p className="text-xs text-slate-500">Checked in today · WAT</p>
            <p className="text-3xl font-bold tabular-nums text-slate-900">
              {count ? count.today.toLocaleString() : "—"}
            </p>
            <p className="text-xs text-slate-500">
              {count ? `${count.total.toLocaleString()} at this event` : "Loading event count…"}
            </p>
          </div>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-5">
          <div className="grid items-start gap-5 md:grid-cols-2">
            <section
              aria-label="Scan and lookup"
              className="space-y-5 rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#173D2D] text-white">
                  <IconQrcode size={26} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Attendee entry</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    One review. One confirmed admission.
                  </p>
                </div>
              </div>
              {scannerOpen ? (
                <EventPassScanner
                  onDecoded={(credential) => void validateScan(credential)}
                  onClose={() => setScannerOpen(false)}
                />
              ) : (
                <button
                  type="button"
                  className={`${primaryButton} w-full`}
                  disabled={busy !== "idle"}
                  onClick={() => {
                    resetReview();
                    setScannerOpen(true);
                  }}
                >
                  <IconQrcode size={22} />
                  Scan QR
                </button>
              )}
              <form
                className="border-t border-slate-200 pt-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void lookup();
                }}
              >
                <label htmlFor="attendee-lookup" className="text-sm font-semibold text-slate-800">
                  Manual lookup
                </label>
                <p id="lookup-help" className="mt-1 text-xs leading-relaxed text-slate-500">
                  Use a registration reference or attendee email.
                </p>
                <input
                  id="attendee-lookup"
                  aria-describedby="lookup-help"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={254}
                  required
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  disabled={busy !== "idle" || scannerOpen}
                  placeholder="AIAIAC-DEL-… or email"
                  className="mt-3 h-12 w-full min-w-0 rounded-[9px] border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:opacity-50"
                />
                <button
                  type="submit"
                  className={`${secondaryButton} mt-3 w-full`}
                  disabled={busy !== "idle" || scannerOpen || !query.trim()}
                >
                  <Search size={18} />
                  {busy === "lookup" ? "Finding attendee…" : "Find attendee"}
                </button>
              </form>
            </section>
            <div className="space-y-4" aria-live="polite">
              {message ? (
                <div
                  role="alert"
                  data-tone="warning"
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900"
                >
                  {message}
                </div>
              ) : null}
              {busy === "validate" ? (
                <p
                  role="status"
                  className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600"
                >
                  Validating Event Pass…
                </p>
              ) : null}
              {matches.length ? (
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-bold text-slate-900">
                    Choose the attendee to review
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {matches.map((match) =>
                      match.attendee ? (
                        <li key={match.attendee.registrationReference}>
                          <button
                            className={`${secondaryButton} w-full flex-col items-start py-3 text-left`}
                            type="button"
                            onClick={() => selectMatch(match)}
                          >
                            <span>{match.attendee.name}</span>
                            <span className="font-mono text-xs font-normal">
                              {match.attendee.registrationReference}
                            </span>
                          </button>
                        </li>
                      ) : null,
                    )}
                  </ul>
                </section>
              ) : null}
              {review ? (
                <AttendeeReview
                  review={review}
                  canManage={canManage}
                  saving={busy === "confirm"}
                  onConfirm={() => void confirm()}
                />
              ) : busy === "idle" && !matches.length && !message ? (
                <section className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 p-6 text-center">
                  <TicketCheck size={30} className="text-slate-400" />
                  <h2 className="mt-3 text-sm font-semibold text-slate-800">
                    Ready for the next attendee
                  </h2>
                  <p className="mt-1 max-w-xs text-sm leading-relaxed text-slate-500">
                    Scan or look up a registration to open the attendee review.
                  </p>
                </section>
              ) : null}
            </div>
          </div>
        </div>
        <section
          aria-label="Recent check-ins"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent check-ins</h2>
              <p className="mt-1 text-xs text-slate-500">Latest 20 admissions</p>
            </div>
            <button
              type="button"
              onClick={() => void loadActivity()}
              disabled={activityState === "loading"}
              aria-label="Refresh recent check-ins and count"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
            >
              <RotateCw size={18} className={activityState === "loading" ? "animate-spin" : ""} />
            </button>
          </div>
          {activityState === "error" ? (
            <p role="alert" className="border-b border-slate-200 p-5 text-sm text-slate-600">
              Activity could not refresh. Use the refresh button to try again.
            </p>
          ) : null}
          {activityState === "loading" && !recent.length ? (
            <p role="status" className="p-5 text-sm text-slate-500">
              Loading check-ins…
            </p>
          ) : !recent.length ? (
            <div className="px-5 py-8 text-center">
              <Clock size={24} className="mx-auto text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-700">No check-ins yet</p>
              <p className="mt-1 text-xs text-slate-500">Confirmed admissions will appear here.</p>
            </div>
          ) : (
            <ol className="divide-y divide-slate-100">
              {recent.map((item) => (
                <li key={`${item.registrationReference}-${item.checkedInAt}`} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <BadgeCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-slate-900">
                        {item.name}
                      </p>
                      <p className="mt-1 break-all font-mono text-[11px] text-slate-500">
                        {item.registrationReference}
                      </p>
                      <p className="mt-1 text-xs capitalize text-slate-600">
                        {readable(item.category)} ·{" "}
                        {item.method === "QR" ? "QR scan" : "Manual lookup"}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {dateTime(item.checkedInAt)} WAT
                      </p>
                      {item.staffName ? (
                        <p className="mt-1 text-xs text-slate-500">By {item.staffName}</p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
