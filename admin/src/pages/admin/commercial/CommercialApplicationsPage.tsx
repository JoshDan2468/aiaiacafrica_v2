import { CommercialApprovedImport } from "./CommercialApprovedImport";
import { useAuth } from "@/hooks/useAuth";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "@/components/admin/adminIcons";
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
  listCommercialApplications,
  type CommercialApplicationKind,
  type CommercialApplicationListItem,
} from "@/services/commercialApplication/commercialApplicationAdminService";

const packageOptions = {
  SPONSOR: ["TITLE", "STRATEGIC", "DIAMOND", "PLATINUM", "GOLD", "SILVER"],
  EXHIBITOR: ["9_SQM", "18_SQM", "36_SQM"],
} as const;

const filterInputStyle =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-normal text-slate-800 shadow-2xs outline-none transition-colors placeholder:text-slate-400 focus:border-[#05190F] focus:ring-1 focus:ring-[#05190F]";

function formatAmount(item: CommercialApplicationListItem) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: item.currency,
    maximumFractionDigits: 0,
  }).format(item.priceMinor / 100);
}

export function CommercialApplicationsPage({ kind }: { kind: CommercialApplicationKind }) {
  const { admin } = useAuth();
  const canManage = Boolean(
    admin?.permissions.includes(kind === "SPONSOR" ? "sponsors.manage" : "exhibitors.manage"),
  );
  const noun = kind === "SPONSOR" ? "Sponsor" : "Exhibitor";
  const segment = kind === "SPONSOR" ? "sponsor" : "exhibitor";
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<CommercialApplicationListItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [packageCode, setPackageCode] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    setState("loading");
    const query = new URLSearchParams({ page: String(page), limit: "20" });
    if (search.trim()) query.set("search", search.trim());
    if (status) query.set("status", status);
    if (packageCode) query.set("package", packageCode);
    const result = await listCommercialApplications(kind, query);
    if (!result.ok) {
      setState("error");
      return;
    }
    setItems(result.applications.items);
    setTotalPages(result.applications.totalPages);
    setState("ready");
  }, [kind, packageCode, page, search, status]);

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

  const [, setSearchParams] = useSearchParams();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={`Commercial / ${noun}s`}
        title={`${noun} applications`}
        description={`Review ${noun.toLowerCase()} applications and package selections. Approving an application confirms the agreement; payment is tracked separately.`}
      />
      {canManage && <CommercialApprovedImport kind={kind} onImported={() => void load()} />}
      <form
        className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs sm:grid-cols-2 sm:p-4 lg:grid-cols-[1fr_auto_auto_auto_auto] dark:border-[#29352D] dark:bg-[#151F19]"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          void load();
        }}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            aria-label={`Search ${noun} applications`}
            className={`${filterInputStyle} min-h-10 sm:h-9 pl-9`}
            placeholder="Reference, organization, contact…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          aria-label="Filter by status"
          className={`${filterInputStyle} min-h-10 sm:h-9`}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="MORE_INFORMATION_REQUIRED">More information required</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="DECLINED">Declined</option>
        </select>
        <select
          aria-label="Filter by package"
          className={`${filterInputStyle} min-h-10 sm:h-9`}
          value={packageCode}
          onChange={(event) => {
            setPackageCode(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All packages</option>
          {packageOptions[kind].map((option) => (
            <option key={option} value={option}>
              {option.replace("_", " ")}
            </option>
          ))}
        </select>
        <button
          className="min-h-10 sm:h-9 rounded-md bg-[#05190F] px-4 text-xs font-semibold text-white hover:bg-[#05190F]/90 transition-colors"
          type="submit"
        >
          Search
        </button>
        {(search || status || packageCode) && (
          <button
            className="min-h-10 sm:h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("");
              setPackageCode("");
              setPage(1);
              setSearchParams({});
            }}
          >
            Reset
          </button>
        )}
      </form>

      {state === "loading" ? (
        <AdminTableLoadingState message={`Loading ${noun.toLowerCase()} applications…`} />
      ) : state === "error" ? (
        <AdminTableErrorState
          message={`We could not load ${noun.toLowerCase()} applications.`}
          onRetry={() => void load()}
        />
      ) : items.length === 0 ? (
        <AdminTableEmptyState
          title={`No ${noun.toLowerCase()} applications found`}
          description="No commercial applications match your query."
        />
      ) : (
        <AdminTable minWidth="min-w-[64rem]">
          <AdminTableHeader>
            <tr>
              <AdminTableHeaderCell>Reference</AdminTableHeaderCell>
              <AdminTableHeaderCell>Organization</AdminTableHeaderCell>
              <AdminTableHeaderCell>Primary contact</AdminTableHeaderCell>
              <AdminTableHeaderCell>Package</AdminTableHeaderCell>
              <AdminTableHeaderCell>Value</AdminTableHeaderCell>
              <AdminTableHeaderCell>Status</AdminTableHeaderCell>
              <AdminTableHeaderCell>Submitted</AdminTableHeaderCell>
              <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
            </tr>
          </AdminTableHeader>
          <AdminTableBody>
            {items.map((item) => (
              <AdminTableRow key={item.reference}>
                <AdminTableCell>
                  <Link
                    className="font-semibold text-[#05190F] hover:underline"
                    to={`/admin/${segment}-applications/${item.reference}`}
                  >
                    {item.reference}
                  </Link>
                </AdminTableCell>
                <AdminTableCell className="font-semibold text-slate-900">
                  {item.organizationName}
                </AdminTableCell>
                <AdminTableCell>
                  <span className="block font-semibold text-slate-900">{item.contactName}</span>
                  <span className="text-xs text-slate-500">{item.contactEmail}</span>
                </AdminTableCell>
                <AdminTableCell className="text-xs text-slate-600">
                  {item.packageName}
                </AdminTableCell>
                <AdminTableCell className="font-semibold text-slate-900">
                  {formatAmount(item)}
                </AdminTableCell>
                <AdminTableCell>
                  <AdminStatusBadge status={item.status} />
                </AdminTableCell>
                <AdminTableCell className="whitespace-nowrap text-xs text-slate-500 font-medium">
                  {new Date(item.submittedAt).toLocaleDateString("en-GB")}
                </AdminTableCell>
                <AdminTableCell>
                  <Link
                    className="inline-flex min-h-10 items-center rounded-md border border-slate-200 px-3 text-xs font-semibold text-[#173D2D] hover:bg-slate-50 focus-visible:outline-2"
                    to={`/admin/${segment}-applications/${item.reference}`}
                  >
                    View and review
                  </Link>
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}
      <div className="flex items-center justify-end gap-3 text-xs font-semibold text-slate-600">
        <button
          className="min-h-10 sm:h-8 rounded-md border border-slate-200 bg-white px-3 hover:bg-slate-50 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
          type="button"
        >
          Previous
        </button>
        <span>
          Page {page}
          {totalPages ? ` of ${totalPages}` : ""}
        </span>
        <button
          className="min-h-10 sm:h-8 rounded-md border border-slate-200 bg-white px-3 hover:bg-slate-50 disabled:opacity-40"
          disabled={!totalPages || page >= totalPages}
          onClick={() => setPage((value) => value + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
}
