import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableEmptyState,
  AdminTableErrorState,
  AdminTableHeader,
  AdminTableHeaderCell,
  AdminTableLoadingState,
  AdminTableRow,
} from "@/components/admin/AdminTable";
import { useAuth } from "@/hooks/useAuth";
import {
  createAccreditation,
  listAccreditationEvents,
  listAccreditations,
} from "@/services/accreditation/accreditationService";
import {
  accreditationCategories,
  formatAccreditationCategory,
  intakeAccreditationCategories,
  isRepresentativeCategory,
  type Accreditation,
  type AccreditationCategory,
  type AccreditationEvent,
  type AccreditationStatus,
  type IntakeAccreditationCategory,
} from "@/types/accreditation";

const inputClass =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#173D2D] focus:ring-1 focus:ring-[#173D2D]";

const statusOptions: AccreditationStatus[] = ["LINKED", "PENDING", "APPROVED", "REVOKED"];

function sourceLabel(item: Accreditation) {
  if (item.sourceType === "DELEGATE_REGISTRATION") return "Delegate registration";
  if (item.sourceType === "SPONSOR_APPLICATION") return "Sponsor application";
  if (item.sourceType === "EXHIBITOR_APPLICATION") return "Exhibitor application";
  return "Admin intake";
}

function sourcePath(item: Accreditation) {
  if (!item.sourceReference) return null;
  if (item.sourceType === "SPONSOR_APPLICATION")
    return `/admin/sponsor-applications/${encodeURIComponent(item.sourceReference)}`;
  if (item.sourceType === "EXHIBITOR_APPLICATION")
    return `/admin/exhibitor-applications/${encodeURIComponent(item.sourceReference)}`;
  if (item.sourceType === "DELEGATE_REGISTRATION" && item.sourceId)
    return `/admin/delegates/${encodeURIComponent(item.sourceId)}`;
  return null;
}

export function AccreditationsPage() {
  const { admin } = useAuth();
  const canManage = admin?.permissions.includes("accreditations.manage") ?? false;
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState<AccreditationEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [createEventId, setCreateEventId] = useState("");
  const [category, setCategory] = useState<AccreditationCategory | "">(
    accreditationCategories.includes(searchParams.get("category") as AccreditationCategory)
      ? (searchParams.get("category") as AccreditationCategory)
      : "",
  );
  const [status, setStatus] = useState<AccreditationStatus | "">("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [records, setRecords] = useState<Accreditation[]>([]);
  const requestId = useRef(0);
  const resultsAnchor = useRef<HTMLDivElement>(null);
  const pendingScrollPage = useRef<number | null>(null);
  const [scrollReadyPage, setScrollReadyPage] = useState<number | null>(null);
  const [eventState, setEventState] = useState<"loading" | "ready" | "error">("loading");
  const [listState, setListState] = useState<"loading" | "ready" | "error">("loading");
  const [createOpen, setCreateOpen] = useState(
    Boolean(searchParams.get("sourceApplicationReference")),
  );
  const [createCategory, setCreateCategory] = useState<IntakeAccreditationCategory>(
    (intakeAccreditationCategories.includes(
      searchParams.get("category") as IntakeAccreditationCategory,
    )
      ? searchParams.get("category")
      : "SPEAKER") as IntakeAccreditationCategory,
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [country, setCountry] = useState("");
  const [sourceApplicationReference, setSourceApplicationReference] = useState(
    searchParams.get("sourceApplicationReference") ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [createError, setCreateError] = useState("");

  const loadEvents = useCallback(async () => {
    setEventState("loading");
    const result = await listAccreditationEvents();
    if (!result.ok) {
      setEventState("error");
      return;
    }
    setEvents(result.events);
    setEventId(
      (current) =>
        current || result.events.find((event) => event.isActive)?.id || result.events[0]?.id || "",
    );
    setCreateEventId(
      (current) =>
        current || result.events.find((event) => event.isActive)?.id || result.events[0]?.id || "",
    );
    setEventState("ready");
  }, []);

  const loadRecords = useCallback(async () => {
    if (!eventId) return;
    const currentRequestId = ++requestId.current;
    setListState("loading");
    const result = await listAccreditations({
      eventId,
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
      page,
    });
    if (currentRequestId !== requestId.current) return;
    if (!result.ok) {
      setListState("error");
      return;
    }
    setRecords(result.accreditations);
    setHasMore(result.hasMore);
    setListState("ready");
    if (pendingScrollPage.current === page) {
      pendingScrollPage.current = null;
      setScrollReadyPage(page);
    }
  }, [category, eventId, page, status]);

  useLayoutEffect(() => {
    if (scrollReadyPage === null) return;
    resultsAnchor.current?.scrollIntoView?.({ behavior: "instant", block: "start" });
    setScrollReadyPage(null);
  }, [scrollReadyPage]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const submit = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!createEventId || !canManage) return;
    pendingScrollPage.current = null;
    setSubmitting(true);
    setCreateError("");
    setMessage("");
    const result = await createAccreditation({
      eventId: createEventId,
      category: createCategory,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      ...(organizationName.trim() ? { organizationName: organizationName.trim() } : {}),
      ...(country.trim() ? { country: country.trim() } : {}),
      ...(isRepresentativeCategory(createCategory)
        ? { sourceApplicationReference: sourceApplicationReference.trim().toUpperCase() }
        : {}),
    });
    setSubmitting(false);
    if (!result.ok) {
      setCreateError(result.error);
      return;
    }
    setFullName("");
    setEmail("");
    setOrganizationName("");
    setCountry("");
    setSourceApplicationReference("");
    setCreateOpen(false);
    setMessage(
      `${formatAccreditationCategory(createCategory)} recorded as pending. No Event Pass was issued.`,
    );
    if (page === 1) await loadRecords();
    else setPage(1);
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Operations / Accreditation"
        title="Accreditations"
        description="A person-level register linked to authoritative conference sources. Accreditation does not issue an Event Pass."
        actions={
          canManage ? (
            <button
              type="button"
              onClick={() => setCreateOpen((open) => !open)}
              className="rounded-md bg-[#173D2D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#102C20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2D]"
            >
              {createOpen ? "Close intake" : "Add attendee"}
            </button>
          ) : undefined
        }
      />

      {message && (
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {message}
        </p>
      )}

      {canManage && createOpen && (
        <section
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs"
          aria-labelledby="accreditation-intake-title"
        >
          <div className="mb-4 border-b border-slate-100 pb-3">
            <h2 id="accreditation-intake-title" className="text-base font-bold text-slate-900">
              Controlled attendee intake
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Every record starts pending. Sponsor and Exhibitor representatives remain pending
              until allocation rules are approved. No pass or QR is created here.
            </p>
          </div>
          <form
            onSubmit={(formEvent) => void submit(formEvent)}
            className="grid gap-4 md:grid-cols-2"
          >
            {createError && (
              <p
                role="alert"
                className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 md:col-span-2"
              >
                {createError}
              </p>
            )}
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              <span>Attendee category</span>
              <select
                className={inputClass}
                value={createCategory}
                onChange={(event) =>
                  setCreateCategory(event.target.value as IntakeAccreditationCategory)
                }
              >
                {intakeAccreditationCategories.map((value) => (
                  <option key={value} value={value}>
                    {formatAccreditationCategory(value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              <span>Event</span>
              <select
                aria-label="Intake event"
                className={inputClass}
                value={createEventId}
                onChange={(event) => setCreateEventId(event.target.value)}
                required
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} ({event.year})
                  </option>
                ))}
              </select>
              <span className="block font-normal text-slate-500">
                Intake event is independent of the list filter below.
              </span>
            </label>
            {isRepresentativeCategory(createCategory) && (
              <label className="space-y-1 text-xs font-semibold text-slate-700 md:col-span-2">
                <span>
                  {createCategory === "SPONSOR_REPRESENTATIVE" ? "Sponsor" : "Exhibitor"}{" "}
                  application reference
                </span>
                <input
                  className={inputClass}
                  aria-label={`${createCategory === "SPONSOR_REPRESENTATIVE" ? "Sponsor" : "Exhibitor"} application reference`}
                  value={sourceApplicationReference}
                  onChange={(event) => setSourceApplicationReference(event.target.value)}
                  placeholder={createCategory === "SPONSOR_REPRESENTATIVE" ? "SPN-…" : "EXH-…"}
                  required
                />
                <span className="block font-normal text-slate-500">
                  Use the reference from the existing organization application. This links the
                  person to that application; it does not grant admission.
                </span>
              </label>
            )}
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              <span>Full name</span>
              <input
                className={inputClass}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                maxLength={160}
                required
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              <span>Email</span>
              <input
                className={inputClass}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                maxLength={254}
                required
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              <span>Organization / company</span>
              <input
                className={inputClass}
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                maxLength={160}
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              <span>Country</span>
              <input
                className={inputClass}
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                maxLength={100}
              />
            </label>
            <div className="flex items-center justify-end gap-3 md:col-span-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !createEventId}
                className="rounded-md bg-[#173D2D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#102C20] disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Record accreditation"}
              </button>
            </div>
          </form>
        </section>
      )}

      {eventState === "loading" ? (
        <AdminTableLoadingState message="Loading events…" />
      ) : eventState === "error" ? (
        <AdminTableErrorState
          message="Events could not be loaded."
          onRetry={() => void loadEvents()}
        />
      ) : events.length === 0 ? (
        <AdminTableEmptyState
          title="No conference event configured"
          description="An event must exist before attendee accreditation can be recorded."
        />
      ) : (
        <>
          <section
            className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs sm:grid-cols-3"
            aria-label="Accreditation filters"
          >
            <label className="space-y-1 text-xs font-semibold text-slate-600">
              <span>Event</span>
              <select
                aria-label="Filter by event"
                className={inputClass}
                value={eventId}
                onChange={(event) => {
                  pendingScrollPage.current = null;
                  setEventId(event.target.value);
                  setPage(1);
                }}
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} ({event.year})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-600">
              <span>Category</span>
              <select
                aria-label="Filter by category"
                className={inputClass}
                value={category}
                onChange={(event) => {
                  pendingScrollPage.current = null;
                  setCategory(event.target.value as AccreditationCategory | "");
                  setPage(1);
                }}
              >
                <option value="">All categories</option>
                {accreditationCategories.map((value) => (
                  <option key={value} value={value}>
                    {formatAccreditationCategory(value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-600">
              <span>Status</span>
              <select
                aria-label="Filter by status"
                className={inputClass}
                value={status}
                onChange={(event) => {
                  pendingScrollPage.current = null;
                  setStatus(event.target.value as AccreditationStatus | "");
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                {statusOptions.map((value) => (
                  <option key={value} value={value}>
                    {value.charAt(0) + value.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <div
            ref={resultsAnchor}
            className="flex scroll-mt-24 items-center justify-between text-xs font-medium text-slate-500"
          >
            <span>
              {listState === "ready"
                ? `${records.length} ${records.length === 1 ? "person" : "people"} on this page`
                : "Person-level register"}
            </span>
            <span>Pass issuance is not available in this step</span>
          </div>
          {listState === "loading" ? (
            <AdminTableLoadingState message="Loading accreditations…" />
          ) : listState === "error" ? (
            <AdminTableErrorState
              message="Accreditations could not be loaded."
              onRetry={() => void loadRecords()}
            />
          ) : records.length === 0 ? (
            <AdminTableEmptyState
              title="No accreditations found"
              description="No people match this event, category, and status."
            />
          ) : (
            <>
              <div className="space-y-2 md:hidden" aria-label="Accreditation results">
                {records.map((item) => (
                  <article
                    key={item.id}
                    className="space-y-2 rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={`/admin/accreditations/${item.id}`}
                          className="admin-accreditation-link font-semibold hover:underline focus-visible:underline"
                        >
                          {item.fullName}
                        </Link>
                        <p className="break-all text-xs text-slate-500">{item.email}</p>
                      </div>
                      <AdminStatusBadge status={item.status} />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                      {formatAccreditationCategory(item.category)}
                    </p>
                    <p className="text-xs text-slate-600">
                      {item.sourceOrganizationName || item.organizationName || "No organization"}
                    </p>
                    <p className="text-xs text-slate-600">
                      Source: {sourceLabel(item)}{" "}
                      {sourcePath(item) ? (
                        <Link
                          to={sourcePath(item)!}
                          className="admin-accreditation-link font-semibold hover:underline focus-visible:underline"
                        >
                          {item.sourceReference}
                        </Link>
                      ) : (
                        item.sourceReference || ""
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      Recorded {new Date(item.createdAt).toLocaleDateString("en-GB")}
                    </p>
                  </article>
                ))}
              </div>
              <p className="hidden text-xs text-slate-500 md:block xl:hidden">
                Scroll the table horizontally to view all source and status fields →
              </p>
              <div className="hidden md:block">
                <AdminTable minWidth="min-w-[68rem]">
                  <AdminTableHeader>
                    <tr>
                      <AdminTableHeaderCell>Person</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Category</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Organization</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Source</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Recorded</AdminTableHeaderCell>
                    </tr>
                  </AdminTableHeader>
                  <AdminTableBody>
                    {records.map((item) => (
                      <AdminTableRow key={item.id}>
                        <AdminTableCell>
                          <Link
                            to={`/admin/accreditations/${item.id}`}
                            className="admin-accreditation-link font-semibold hover:underline focus-visible:underline"
                          >
                            {item.fullName}
                          </Link>
                          <span className="block text-xs text-slate-500">{item.email}</span>
                        </AdminTableCell>
                        <AdminTableCell className="text-xs font-semibold text-slate-700">
                          {formatAccreditationCategory(item.category)}
                        </AdminTableCell>
                        <AdminTableCell className="text-xs">
                          {item.sourceOrganizationName || item.organizationName || "—"}
                        </AdminTableCell>
                        <AdminTableCell>
                          <span className="block text-xs font-medium text-slate-700">
                            {sourceLabel(item)}
                          </span>
                          {sourcePath(item) ? (
                            <Link
                              to={sourcePath(item)!}
                              className="admin-accreditation-link text-xs font-semibold hover:underline focus-visible:underline"
                            >
                              {item.sourceReference}
                            </Link>
                          ) : item.sourceReference ? (
                            <span className="text-xs text-slate-500">{item.sourceReference}</span>
                          ) : null}
                        </AdminTableCell>
                        <AdminTableCell>
                          <AdminStatusBadge status={item.status} />
                        </AdminTableCell>
                        <AdminTableCell className="whitespace-nowrap text-xs text-slate-500">
                          {new Date(item.createdAt).toLocaleDateString("en-GB")}
                        </AdminTableCell>
                      </AdminTableRow>
                    ))}
                  </AdminTableBody>
                </AdminTable>
              </div>
            </>
          )}
          <nav
            aria-label="Accreditation pages"
            className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 sm:justify-end"
          >
            <span aria-live="polite" className="text-sm font-semibold text-slate-700 sm:mr-2">
              Page {page}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 1 || listState !== "ready"}
                onClick={() => {
                  pendingScrollPage.current = page - 1;
                  setPage(page - 1);
                }}
                className="min-h-11 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2D] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!hasMore || listState !== "ready"}
                onClick={() => {
                  pendingScrollPage.current = page + 1;
                  setPage(page + 1);
                }}
                className="min-h-11 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2D] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
