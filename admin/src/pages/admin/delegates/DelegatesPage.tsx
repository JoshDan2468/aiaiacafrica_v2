import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  FilterX,
  Search,
  SlidersHorizontal,
} from "@/components/admin/adminIcons";
import {
  getAdminDelegates,
  type DelegateListFilters,
  type DelegateListItem,
  type DelegatePackage,
  type PaymentStatus,
  type RegistrationStatus,
} from "@/services/delegate/delegateAdminService";
import { getDelegatePackages } from "@/services/delegate/delegatePackageService";
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

const registrationStatuses: RegistrationStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];
const paymentStatuses: PaymentStatus[] = ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"];

const filterInputStyle =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-normal text-slate-800 shadow-2xs outline-none transition-colors placeholder:text-slate-400 focus:border-[#05190F] focus:ring-1 focus:ring-[#05190F]";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DelegatesPage() {
  const [searchParams] = useSearchParams();
  const initialPaymentStatus = (searchParams.get("paymentStatus") as PaymentStatus) || undefined;
  const initialRegistrationStatus = (searchParams.get("status") as RegistrationStatus) || undefined;
  const [filters, setFilters] = useState<DelegateListFilters>({
    page: 1,
    limit: 20,
    sort: "submitted_desc",
    paymentStatus: initialPaymentStatus,
    registrationStatus: initialRegistrationStatus,
  });
  const [pendingFilters, setPendingFilters] = useState<DelegateListFilters>({
    page: 1,
    limit: 20,
    sort: "submitted_desc",
    paymentStatus: initialPaymentStatus,
    registrationStatus: initialRegistrationStatus,
  });
  const [items, setItems] = useState<DelegateListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [packages, setPackages] = useState<DelegatePackage[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const requestSequence = useRef(0);
  const hasLoaded = useRef(false);
  const lastAutomaticRefresh = useRef(0);

  const load = useCallback(async (nextFilters: DelegateListFilters, showLoading = false) => {
    const sequence = ++requestSequence.current;
    if (showLoading) setState("loading");
    else setRefreshing(true);
    const result = await getAdminDelegates(nextFilters);
    if (sequence !== requestSequence.current) return;
    setRefreshing(false);
    if (!result.ok) {
      if (showLoading || !hasLoaded.current || result.status === 401 || result.status === 403) {
        if (result.status === 401 || result.status === 403) {
          setItems([]);
          setTotal(0);
          hasLoaded.current = false;
        }
        setState("error");
      } else {
        setRefreshError(true);
      }
      return;
    }
    hasLoaded.current = true;
    setRefreshError(false);
    setItems(result.registrations.items);
    setTotal(result.registrations.total);
    setState("ready");
  }, []);

  useEffect(() => {
    void load(filters, true);
    return () => {
      requestSequence.current += 1;
    };
  }, [filters, load]);

  useEffect(() => {
    const nextPaymentStatus = (searchParams.get("paymentStatus") as PaymentStatus) || undefined;
    const nextRegistrationStatus = (searchParams.get("status") as RegistrationStatus) || undefined;
    if (
      nextPaymentStatus !== filters.paymentStatus ||
      nextRegistrationStatus !== filters.registrationStatus
    ) {
      const updated = {
        ...filters,
        page: 1,
        paymentStatus: nextPaymentStatus,
        registrationStatus: nextRegistrationStatus,
      };
      setFilters(updated);
      setPendingFilters(updated);
    }
  }, [searchParams]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.hidden || Date.now() - lastAutomaticRefresh.current < 1000) return;
      lastAutomaticRefresh.current = Date.now();
      void load(filters);
    };
    const interval = window.setInterval(refreshIfVisible, 30_000);
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
    };
  }, [filters, load]);

  useEffect(() => {
    void getDelegatePackages().then((result) => result.ok && setPackages(result.packages));
  }, []);

  const pageCount = Math.max(1, Math.ceil(total / (filters.limit ?? 20)));
  const rangeLabel = useMemo(() => {
    if (!total) return "No registrations";
    const limit = filters.limit ?? 20;
    const first = (filters.page! - 1) * limit + 1;
    return `${first}–${Math.min(first + limit - 1, total)} of ${total}`;
  }, [filters.limit, filters.page, total]);

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    setFilters({ ...pendingFilters, page: 1, limit: 20 });
  };

  const resetFilters = () => {
    const next = { page: 1, limit: 20, sort: "submitted_desc" as const };
    setPendingFilters(next);
    setFilters(next);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Registration / Delegates"
        title="Delegate Directory"
        description="Search, filter, and inspect verified conference delegate applications and payment records."
        actions={
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
              {rangeLabel}
            </span>
            <button
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              type="button"
              disabled={refreshing}
              onClick={() => void load(filters)}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        }
      />

      {/* Filter Bar */}
      <form
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs"
        onSubmit={applyFilters}
      >
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
            <SlidersHorizontal className="size-3.5 text-slate-500" />
            Filter Delegates
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <FilterX className="size-3.5" />
            Reset
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative block">
            <span className="sr-only">Search delegates</span>
            <Search
              className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              className={`${filterInputStyle} pl-9`}
              placeholder="Search reference, name, email or company…"
              value={pendingFilters.search ?? ""}
              onChange={(event) =>
                setPendingFilters({ ...pendingFilters, search: event.target.value })
              }
            />
          </label>

          <label>
            <span className="sr-only">Package</span>
            <select
              aria-label="Package filter"
              className={filterInputStyle}
              value={pendingFilters.packageId ?? ""}
              onChange={(event) =>
                setPendingFilters({ ...pendingFilters, packageId: event.target.value || undefined })
              }
            >
              <option value="">All Packages</option>
              {packages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Registration Status</span>
            <select
              aria-label="Registration status filter"
              className={filterInputStyle}
              value={pendingFilters.registrationStatus ?? ""}
              onChange={(event) =>
                setPendingFilters({
                  ...pendingFilters,
                  registrationStatus: (event.target.value || undefined) as
                    RegistrationStatus | undefined,
                })
              }
            >
              <option value="">All Registration Statuses</option>
              {registrationStatuses.map((item) => (
                <option key={item} value={item}>
                  {item.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Payment Status</span>
            <select
              aria-label="Payment status filter"
              className={filterInputStyle}
              value={pendingFilters.paymentStatus ?? ""}
              onChange={(event) =>
                setPendingFilters({
                  ...pendingFilters,
                  paymentStatus: (event.target.value || undefined) as PaymentStatus | undefined,
                })
              }
            >
              <option value="">All Payment Statuses</option>
              {paymentStatuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Country</span>
            <input
              className={filterInputStyle}
              placeholder="Country"
              value={pendingFilters.country ?? ""}
              onChange={(event) =>
                setPendingFilters({ ...pendingFilters, country: event.target.value })
              }
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] font-medium text-slate-500">From</span>
            <input
              type="date"
              aria-label="Submitted From"
              className={filterInputStyle}
              value={pendingFilters.submittedFrom ?? ""}
              onChange={(event) =>
                setPendingFilters({ ...pendingFilters, submittedFrom: event.target.value })
              }
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] font-medium text-slate-500">To</span>
            <input
              type="date"
              aria-label="Submitted To"
              className={filterInputStyle}
              value={pendingFilters.submittedTo ?? ""}
              onChange={(event) =>
                setPendingFilters({ ...pendingFilters, submittedTo: event.target.value })
              }
            />
          </label>

          <label>
            <span className="sr-only">Sort Order</span>
            <select
              aria-label="Sort order"
              className={filterInputStyle}
              value={pendingFilters.sort ?? "submitted_desc"}
              onChange={(event) =>
                setPendingFilters({
                  ...pendingFilters,
                  sort: event.target.value as DelegateListFilters["sort"],
                })
              }
            >
              <option value="submitted_desc">Newest First</option>
              <option value="submitted_asc">Oldest First</option>
              <option value="name_asc">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
            </select>
          </label>
        </div>

        <div className="mt-3.5 flex items-center justify-end gap-3 pt-2.5 border-t border-slate-100">
          <button
            type="submit"
            className="min-h-10 sm:min-h-9 rounded-md bg-[#05190F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#05190F]/90 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {refreshError && state === "ready" ? (
        <p className="text-xs font-medium text-amber-800" role="status">
          Could not refresh delegates. Showing the last loaded results.
        </p>
      ) : null}

      {/* Directory Table */}
      {state === "loading" ? (
        <AdminTableLoadingState message="Loading delegate directory…" />
      ) : state === "error" ? (
        <AdminTableErrorState
          message="We could not load delegate registrations."
          onRetry={() => void load(filters, true)}
        />
      ) : items.length === 0 ? (
        <AdminTableEmptyState
          title="No delegates found"
          description="No delegate registrations match your filter criteria."
          action={
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear Filters
            </button>
          }
        />
      ) : (
        <AdminTable minWidth="min-w-[74rem]">
          <AdminTableHeader>
            <tr>
              <AdminTableHeaderCell>Reference</AdminTableHeaderCell>
              <AdminTableHeaderCell>Delegate Name</AdminTableHeaderCell>
              <AdminTableHeaderCell>Email address</AdminTableHeaderCell>
              <AdminTableHeaderCell>Company</AdminTableHeaderCell>
              <AdminTableHeaderCell>Package</AdminTableHeaderCell>
              <AdminTableHeaderCell>Country</AdminTableHeaderCell>
              <AdminTableHeaderCell>Registration</AdminTableHeaderCell>
              <AdminTableHeaderCell>Email verification</AdminTableHeaderCell>
              <AdminTableHeaderCell>Payment</AdminTableHeaderCell>
              <AdminTableHeaderCell>Submitted</AdminTableHeaderCell>
            </tr>
          </AdminTableHeader>
          <AdminTableBody>
            {items.map((item) => (
              <AdminTableRow key={item.id}>
                <AdminTableCell>
                  <Link
                    className="font-semibold text-[#05190F] hover:underline"
                    to={`/admin/delegates/${item.id}`}
                  >
                    {item.reference}
                  </Link>
                </AdminTableCell>
                <AdminTableCell className="font-semibold text-slate-900">
                  {item.firstName} {item.lastName}
                </AdminTableCell>
                <AdminTableCell className="text-xs text-slate-600">
                  <a className="hover:underline" href={`mailto:${item.email}`}>
                    {item.email}
                  </a>
                </AdminTableCell>
                <AdminTableCell className="text-xs text-slate-600">
                  {item.companyName}
                </AdminTableCell>
                <AdminTableCell className="text-xs text-slate-600">
                  {item.packageName}
                </AdminTableCell>
                <AdminTableCell className="text-xs text-slate-600">{item.country}</AdminTableCell>
                <AdminTableCell>
                  <AdminStatusBadge
                    status={
                      item.registrationStatus === "SUBMITTED"
                        ? "REGISTERED"
                        : item.registrationStatus
                    }
                  />
                </AdminTableCell>
                <AdminTableCell>
                  <AdminStatusBadge status={item.emailVerificationStatus} />
                </AdminTableCell>
                <AdminTableCell>
                  <AdminStatusBadge status={item.paymentStatus} />
                </AdminTableCell>
                <AdminTableCell className="whitespace-nowrap text-xs text-slate-500 font-medium">
                  {formatDate(item.submittedAt)}
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}

      {/* Pagination Footer */}
      {state === "ready" && total > (filters.limit ?? 20) && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xs">
          <p className="text-xs font-medium text-slate-500">{rangeLabel}</p>
          <div className="flex items-center gap-2">
            <button
              disabled={filters.page === 1}
              type="button"
              className="flex min-h-10 sm:min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              onClick={() => setFilters({ ...filters, page: filters.page! - 1 })}
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </button>
            <button
              disabled={filters.page === pageCount}
              type="button"
              className="flex min-h-10 sm:min-h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
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
