import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "@/components/admin/adminIcons";
import { analysisStatusLabels } from "@/services/abstractSubmission/abstractAnalysisTypes";
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
  listAbstracts,
  type AbstractListItem,
  type AbstractStatus,
} from "@/services/abstractSubmission/abstractSubmissionAdminService";

const statuses: AbstractStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "REVISION_REQUIRED",
  "ACCEPTED",
  "REJECTED",
];

const filterInputStyle =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-normal text-slate-800 shadow-2xs outline-none transition-colors placeholder:text-slate-400 focus:border-[#05190F] focus:ring-1 focus:ring-[#05190F]";

export function AbstractSubmissionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [items, setItems] = useState<AbstractListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (activeSearch) params.set("search", activeSearch);
    if (status) params.set("status", status);
    const result = await listAbstracts(params);
    if (!result.ok) {
      setState("error");
      return;
    }
    setItems(result.submissions.items);
    setTotal(result.submissions.total);
    setTotalPages(result.submissions.totalPages);
    setState("ready");
  }, [page, limit, activeSearch, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const paramStatus = searchParams.get("status") || "";
    if (paramStatus !== status) {
      setStatus(paramStatus);
      setPage(1);
    }
  }, [searchParams]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Programme / Submissions"
        title="Abstract Submissions"
        description="Review, evaluate, and manage paper abstracts submitted for AIAIAC Africa 2027."
      />

      <form
        className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs sm:flex-row sm:flex-wrap sm:items-center dark:border-[#29352D] dark:bg-[#151F19]"
        onSubmit={submitSearch}
      >
        <div className="relative w-full sm:min-w-56 sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            aria-label="Search abstract submissions"
            className={`${filterInputStyle} min-h-10 sm:h-9 pl-9`}
            placeholder="Reference, author, organization, title…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <select
          aria-label="Filter by status"
          className={`${filterInputStyle} min-h-10 sm:h-9 w-full sm:w-[200px] sm:flex-none`}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <button
          className="min-h-10 sm:h-9 w-full rounded-md bg-[#05190F] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#05190F]/90 sm:w-auto"
          type="submit"
        >
          Search
        </button>
        {(searchInput || activeSearch || status) && (
          <button
            className="min-h-10 sm:h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 sm:w-auto"
            type="button"
            onClick={() => {
              setSearchInput("");
              setActiveSearch("");
              setStatus("");
              setPage(1);
              setSearchParams({});
            }}
          >
            Reset
          </button>
        )}
      </form>

      {state === "loading" ? (
        <AdminTableLoadingState message="Loading abstract submissions…" />
      ) : state === "error" ? (
        <AdminTableErrorState
          message="We could not load abstract submissions."
          onRetry={() => void load()}
        />
      ) : items.length === 0 ? (
        <AdminTableEmptyState
          title="No abstract submissions found"
          description="No abstract submissions match your query."
        />
      ) : (
        <div className="space-y-4">
          <AdminTable minWidth="min-w-[80rem]">
            <AdminTableHeader>
              <tr>
                <AdminTableHeaderCell>Reference</AdminTableHeaderCell>
                <AdminTableHeaderCell>Title</AdminTableHeaderCell>
                <AdminTableHeaderCell>Primary Author</AdminTableHeaderCell>
                <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                <AdminTableHeaderCell>AI advisory analysis</AdminTableHeaderCell>
                <AdminTableHeaderCell>Submitted</AdminTableHeaderCell>
                <AdminTableHeaderCell className="text-right">Actions</AdminTableHeaderCell>
              </tr>
            </AdminTableHeader>
            <AdminTableBody>
              {items.map((item) => (
                <AdminTableRow key={item.reference}>
                  <AdminTableCell className="font-mono text-xs font-semibold text-slate-900">
                    <Link
                      to={`/admin/abstract-submissions/${item.reference}`}
                      className="hover:underline text-slate-900"
                    >
                      {item.reference}
                    </Link>
                  </AdminTableCell>
                  <AdminTableCell>
                    <p className="max-w-xs truncate font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.wordCount} words</p>
                  </AdminTableCell>
                  <AdminTableCell>
                    <p className="font-semibold text-slate-900">{item.authorName}</p>
                    <p className="text-xs text-slate-500">
                      {item.organizationName}
                      {item.country ? ` • ${item.country}` : ""}
                    </p>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminStatusBadge status={item.status} />
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className="max-w-xs space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      <p className="font-semibold">
                        {analysisStatusLabels[item.aiAnalysis?.status ?? "DISABLED"]}
                      </p>
                      {item.aiAnalysis?.status === "COMPLETED" && item.aiAnalysis.result && (
                        <>
                          <p>
                            {item.aiAnalysis.result.categories
                              .map((entry) => entry.category)
                              .join(" · ") || "No suggested category"}
                          </p>
                          <p>
                            Advisory score: {item.aiAnalysis.result.advisoryScore}/100 · Draft
                            rubric
                          </p>
                          <p className="line-clamp-2">{item.aiAnalysis.result.summary}</p>
                        </>
                      )}
                    </div>
                  </AdminTableCell>
                  <AdminTableCell className="text-xs text-slate-500">
                    {new Date(item.submittedAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </AdminTableCell>
                  <AdminTableCell className="text-right">
                    <Link
                      to={`/admin/abstract-submissions/${item.reference}`}
                      className="inline-flex min-h-10 sm:min-h-8 items-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
                    >
                      View and review
                    </Link>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500">
              <p>
                Showing {items.length} of {total} submissions
              </p>
              <div className="flex gap-1.5">
                <button
                  className="min-h-10 sm:min-h-8 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  disabled={page <= 1}
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <span className="flex items-center px-2 font-medium text-slate-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="min-h-10 sm:min-h-8 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  disabled={page >= totalPages}
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
