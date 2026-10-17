import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FilterX, Search } from "@/components/admin/adminIcons";
import { Link } from "react-router-dom";
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
import {
  getAdminStudentVerifications,
  downloadAdminStudentEvidence,
  type StudentEvidenceMetadata,
  type StudentVerificationListFilters,
  type StudentVerificationListItem,
  type StudentVerificationStatus,
} from "@/services/studentVerification/studentVerificationAdminService";

const statuses: StudentVerificationStatus[] = [
  "NOT_SUBMITTED",
  "PENDING",
  "MORE_INFORMATION_REQUIRED",
  "APPROVED",
  "REJECTED",
];

const filterClassName =
  "min-h-10 sm:h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-normal text-slate-800 shadow-2xs outline-none transition-colors placeholder:text-slate-400 focus:border-[#05190F] focus:ring-1 focus:ring-[#05190F]";

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatEvidenceType(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function EvidenceCell({
  reference,
  evidence,
}: {
  reference: string;
  evidence: StudentEvidenceMetadata[];
}) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (evidence.length === 0) return <span className="text-slate-400">None</span>;

  return (
    <div className="min-w-64 space-y-1.5">
      {evidence.map((document) => (
        <div key={document.evidenceId} className="rounded-md border border-slate-200 p-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">
                {formatEvidenceType(document.evidenceType)}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                {document.displayFilename}
              </p>
            </div>
            <AdminStatusBadge status={document.documentStatus} />
          </div>
          {document.documentStatus === "AVAILABLE" && document.scanStatus === "CLEAN" && (
            <button
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#05190F] hover:underline disabled:opacity-50"
              type="button"
              disabled={downloading === document.evidenceId}
              onClick={() => {
                setDownloading(document.evidenceId);
                setError(null);
                void downloadAdminStudentEvidence(
                  reference,
                  document.evidenceId,
                  document.displayFilename,
                ).then((result) => {
                  if (!result.ok) setError(result.error);
                  setDownloading(null);
                });
              }}
            >
              <Download className="size-3" aria-hidden="true" />
              {downloading === document.evidenceId ? "Downloading…" : "Download"}
            </button>
          )}
        </div>
      ))}
      {error && (
        <p className="text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function StudentVerificationsPage() {
  const [filters, setFilters] = useState<StudentVerificationListFilters>({ page: 1, limit: 20 });
  const [draft, setDraft] = useState<StudentVerificationListFilters>(filters);
  const [items, setItems] = useState<StudentVerificationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async (nextFilters: StudentVerificationListFilters) => {
    setState("loading");
    const result = await getAdminStudentVerifications(nextFilters);
    if (!result.ok) {
      setState("error");
      return;
    }
    setItems(result.verifications.items);
    setTotal(result.verifications.total);
    setState("ready");
  }, []);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  const reset = () => {
    const next = { page: 1, limit: 20 };
    setDraft(next);
    setFilters(next);
  };

  const pageCount = Math.max(1, Math.ceil(total / (filters.limit ?? 20)));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Registration / Student Verification"
        title="Student Verification"
        description="Review student applications, uploaded proof of study, and past decisions."
        actions={
          <div className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
            {total} application{total === 1 ? "" : "s"}
          </div>
        }
      />

      <form
        className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-[1fr_15rem_auto_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters({ ...draft, page: 1, limit: 20 });
        }}
      >
        <label className="relative block">
          <span className="sr-only">Search Student verifications</span>
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            className={`${filterClassName} pl-9`}
            placeholder="Reference, delegate, or institution…"
            value={draft.search ?? ""}
            onChange={(event) => setDraft({ ...draft, search: event.target.value })}
          />
        </label>
        <label>
          <span className="sr-only">Verification status</span>
          <select
            aria-label="Verification status"
            className={filterClassName}
            value={draft.status ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                status: (event.target.value || undefined) as StudentVerificationStatus | undefined,
              })
            }
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="min-h-10 sm:h-9 rounded-md bg-[#05190F] px-4 text-xs font-semibold text-white hover:bg-[#05190F]/90 transition-colors"
        >
          Apply filters
        </button>
        <button
          type="button"
          className="flex min-h-10 sm:h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          onClick={reset}
        >
          <FilterX className="size-3.5" /> Reset
        </button>
      </form>

      {state === "loading" ? (
        <AdminTableLoadingState message="Loading Student verification records…" />
      ) : state === "error" ? (
        <AdminTableErrorState
          message="We could not load Student verification records."
          onRetry={() => void load(filters)}
        />
      ) : items.length === 0 ? (
        <AdminTableEmptyState
          title="No Student applications found"
          description="No Student Delegate records match the current filters."
        />
      ) : (
        <AdminTable minWidth="min-w-[64rem]">
          <AdminTableHeader>
            <tr>
              <AdminTableHeaderCell>Reference</AdminTableHeaderCell>
              <AdminTableHeaderCell>Delegate</AdminTableHeaderCell>
              <AdminTableHeaderCell>Institution</AdminTableHeaderCell>
              <AdminTableHeaderCell>Country</AdminTableHeaderCell>
              <AdminTableHeaderCell>Programme</AdminTableHeaderCell>
              <AdminTableHeaderCell>Status</AdminTableHeaderCell>
              <AdminTableHeaderCell>Evidence</AdminTableHeaderCell>
              <AdminTableHeaderCell>Evidence ready</AdminTableHeaderCell>
              <AdminTableHeaderCell>Submitted</AdminTableHeaderCell>
              <AdminTableHeaderCell>Reviewed</AdminTableHeaderCell>
              <AdminTableHeaderCell>Created</AdminTableHeaderCell>
            </tr>
          </AdminTableHeader>
          <AdminTableBody>
            {items.map((item) => (
              <AdminTableRow key={item.registrationReference}>
                <AdminTableCell className="font-semibold text-[#05190F]">
                  <Link
                    className="hover:underline"
                    to={`/admin/student-verifications/${encodeURIComponent(item.registrationReference)}`}
                  >
                    {item.registrationReference}
                  </Link>
                </AdminTableCell>
                <AdminTableCell className="font-semibold text-slate-900">
                  {item.delegateName}
                </AdminTableCell>
                <AdminTableCell>{item.institutionName}</AdminTableCell>
                <AdminTableCell>{item.institutionCountry}</AdminTableCell>
                <AdminTableCell>{item.programmeOfStudy}</AdminTableCell>
                <AdminTableCell>
                  <AdminStatusBadge status={item.verificationStatus} />
                </AdminTableCell>
                <AdminTableCell>
                  <EvidenceCell
                    reference={item.registrationReference}
                    evidence={item.evidence ?? []}
                  />
                </AdminTableCell>
                <AdminTableCell>
                  <span
                    className={`text-xs font-semibold ${
                      item.evidenceReadiness?.minimumEvidenceReady
                        ? "text-emerald-700"
                        : "text-slate-500"
                    }`}
                  >
                    {item.evidenceReadiness?.minimumEvidenceReady ? "Ready" : "Not ready"}
                  </span>
                </AdminTableCell>
                <AdminTableCell>{formatDate(item.submittedAt)}</AdminTableCell>
                <AdminTableCell>{formatDate(item.reviewedAt)}</AdminTableCell>
                <AdminTableCell>{formatDate(item.createdAt)}</AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}

      {state === "ready" && total > (filters.limit ?? 20) && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xs">
          <p className="text-xs font-medium text-slate-500">
            Page {filters.page ?? 1} of {pageCount} · {total} applications
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={(filters.page ?? 1) <= 1}
              type="button"
              className="flex min-h-10 sm:min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) - 1 })}
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </button>
            <button
              disabled={(filters.page ?? 1) >= pageCount}
              type="button"
              className="flex min-h-10 sm:min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) + 1 })}
            >
              Next
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
