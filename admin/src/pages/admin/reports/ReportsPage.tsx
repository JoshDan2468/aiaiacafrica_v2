import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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
  downloadReportCsv,
  getReport,
  getReportSummary,
  reportDefinitions,
  type ReportDomain,
  type ReportFilters,
  type ReportPage,
  type ReportSummary,
} from "@/services/report/reportService";
import type { Permission } from "@/types/auth";

const emptyFilters: ReportFilters = { page: 1, limit: 20 };
const emptyPermissions: readonly Permission[] = [];
const groups = ["Registration", "Finance", "Commercial", "Programme", "Operations"] as const;
const label = (value: string) => value.replaceAll("_", " ");
const currency = (minor: number, code: "NGN" | "USD") =>
  new Intl.NumberFormat(code === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency: code,
  }).format(minor / 100);

const filterInputStyle =
  "mt-1 block h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-normal text-slate-800 shadow-2xs outline-none transition-colors placeholder:text-slate-400 focus:border-[#05190F] focus:ring-1 focus:ring-[#05190F]";

function Summary({ summary }: { summary: ReportSummary }) {
  const metrics = [
    ["Professional registrations", summary.professionalRegistrations],
    ["Paid Professional registrations", summary.paidProfessionalRegistrations],
    ["Pending Professional registrations", summary.pendingProfessionalRegistrations],
    ["Confirmed NGN revenue", currency(summary.confirmedRevenueMinor.NGN, "NGN")],
    ["Confirmed USD revenue", currency(summary.confirmedRevenueMinor.USD, "USD")],
    ["Sponsor applications", summary.sponsorApplications],
    ["Confirmed Sponsors", summary.confirmedSponsors],
    ["Exhibitor applications", summary.exhibitorApplications],
    ["Confirmed Exhibitors", summary.confirmedExhibitors],
    ["Abstract submissions", summary.abstractSubmissions],
    ["Accepted Abstracts", summary.acceptedAbstracts],
    ["Open enquiries", summary.openEnquiries],
  ] as const;

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs"
      aria-label="Management summary"
    >
      <div className="border-b border-slate-100 pb-2.5">
        <h2 className="font-sans text-sm font-bold text-slate-900">Management summary</h2>
        <p className="text-[11px] text-slate-500">
          Revenue is confirmed PAID transactions only; currencies are never combined.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(([name, value]) => (
          <div className="rounded-md border border-slate-100 bg-slate-50/60 p-3" key={name}>
            <p className="text-[11px] font-medium text-slate-500">{name}</p>
            <p className="mt-1 text-base font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Student verification
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {Object.entries(summary.studentsByStatus).map(([status, count]) => (
          <span
            className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
            key={status}
          >
            {label(status)}: {count}
          </span>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-slate-400">
        Generated {new Date(summary.generatedAt).toLocaleString("en-GB")}
      </p>
    </section>
  );
}

export function ReportsPage() {
  const { admin } = useAuth();
  const permissions = admin?.permissions ?? emptyPermissions;
  const financial = permissions.includes("reports.financial");
  const canExport = permissions.includes("reports.export");
  const allowed = useMemo(
    () =>
      reportDefinitions.filter(
        (definition) =>
          permissions.includes(definition.permission) &&
          (definition.domain !== "payments" || financial),
      ),
    [permissions, financial],
  );
  const [domain, setDomain] = useState<ReportDomain | null>(null);
  const selected = allowed.find((definition) => definition.domain === domain) ?? allowed[0];
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);
  const [report, setReport] = useState<ReportPage | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  const load = useCallback(async () => {
    if (!selected) return;
    setState("loading");
    const result = await getReport(selected.domain, filters);
    if (!result.ok) {
      setState("error");
      return;
    }
    setReport(result.report);
    setState("ready");
  }, [selected, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!financial) return;
    void getReportSummary().then((result) => {
      if (result.ok) setSummary(result.summary);
      else setSummaryError(true);
    });
  }, [financial]);

  const changeFilter = (key: keyof ReportFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value || undefined, page: 1 }));
  };

  const exportCsv = async () => {
    if (!selected) return;
    setExporting(true);
    setExportMessage("");
    const result = await downloadReportCsv(selected.domain, filters);
    setExporting(false);
    setExportMessage(result.ok ? "CSV export started." : result.error);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Reporting / Datasets"
        title="Reporting & Exports"
        description="Preview authoritative AIAIAC 2027 records and export filtered CSV datasets."
      />

      {financial &&
        (summary ? (
          <Summary summary={summary} />
        ) : summaryError ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
            Management summary is unavailable.
          </p>
        ) : (
          <p className="text-xs text-slate-500">Loading management summary…</p>
        ))}

      <nav
        aria-label="Report categories"
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs"
      >
        {groups.map((group) => {
          const definitions = allowed.filter((item) => item.group === group);
          if (!definitions.length) return null;
          return (
            <div key={group}>
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {definitions.map((item) => (
                  <button
                    key={item.domain}
                    type="button"
                    aria-current={selected?.domain === item.domain ? "page" : undefined}
                    className={
                      "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors " +
                      (selected?.domain === item.domain
                        ? "bg-[#05190F] text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
                    }
                    onClick={() => {
                      setDomain(item.domain);
                      setFilters(emptyFilters);
                      setExportMessage("");
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {selected ? (
        <section className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-sans text-sm font-bold text-slate-900">{selected.label}</h2>
                <p className="text-[11px] text-slate-500">
                  Filtered results. Preview shows up to 100 rows per page.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(filters.status ||
                  filters.dateFrom ||
                  filters.dateTo ||
                  filters.paymentStatus ||
                  filters.currency ||
                  filters.package ||
                  filters.category) && (
                  <button
                    type="button"
                    className="min-h-9 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    onClick={() => {
                      setFilters(emptyFilters);
                      setExportMessage("");
                    }}
                  >
                    Reset filters
                  </button>
                )}
                {canExport && (
                  <button
                    type="button"
                    disabled={exporting}
                    className="min-h-9 rounded-md bg-[#05190F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#05190F]/90 disabled:opacity-50"
                    onClick={() => void exportCsv()}
                  >
                    {exporting ? "Generating…" : "Export filtered CSV"}
                  </button>
                )}
              </div>
            </div>

            {exportMessage && (
              <p
                role="status"
                className="mt-3 rounded-md bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-700"
              >
                {exportMessage}
              </p>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {selected.statuses && (
                <div>
                  <label
                    htmlFor="report-status"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Status
                  </label>
                  <select
                    id="report-status"
                    aria-label="Report status"
                    className={filterInputStyle}
                    value={filters.status ?? ""}
                    onChange={(event) => changeFilter("status", event.target.value)}
                  >
                    <option value="">All statuses</option>
                    {selected.statuses.map((item) => (
                      <option key={item} value={item}>
                        {label(item)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="report-from" className="block text-xs font-medium text-slate-700">
                  From
                </label>
                <input
                  id="report-from"
                  aria-label="Report from date"
                  type="date"
                  className={filterInputStyle}
                  value={filters.dateFrom ?? ""}
                  onChange={(event) => changeFilter("dateFrom", event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="report-to" className="block text-xs font-medium text-slate-700">
                  To
                </label>
                <input
                  id="report-to"
                  aria-label="Report to date"
                  type="date"
                  className={filterInputStyle}
                  value={filters.dateTo ?? ""}
                  onChange={(event) => changeFilter("dateTo", event.target.value)}
                />
              </div>

              {selected.paymentStatuses && (
                <div>
                  <label
                    htmlFor="report-payment-status"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Payment status
                  </label>
                  <select
                    id="report-payment-status"
                    aria-label="Payment status"
                    className={filterInputStyle}
                    value={filters.paymentStatus ?? ""}
                    onChange={(event) => changeFilter("paymentStatus", event.target.value)}
                  >
                    <option value="">All payment statuses</option>
                    {selected.paymentStatuses.map((value) => (
                      <option key={value} value={value}>
                        {label(value)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selected.currencies && (
                <div>
                  <label
                    htmlFor="report-currency"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Currency
                  </label>
                  <select
                    id="report-currency"
                    aria-label="Currency"
                    className={filterInputStyle}
                    value={filters.currency ?? ""}
                    onChange={(event) => changeFilter("currency", event.target.value)}
                  >
                    <option value="">All currencies</option>
                    {selected.currencies.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selected.packages && (
                <div>
                  <label
                    htmlFor="report-package"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Package
                  </label>
                  <select
                    id="report-package"
                    aria-label="Package"
                    className={filterInputStyle}
                    value={filters.package ?? ""}
                    onChange={(event) => changeFilter("package", event.target.value)}
                  >
                    <option value="">All packages</option>
                    {selected.packages.map((value) => (
                      <option key={value} value={value}>
                        {label(value)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selected.categories && (
                <div>
                  <label
                    htmlFor="report-category"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Category
                  </label>
                  <select
                    id="report-category"
                    aria-label="Category"
                    className={filterInputStyle}
                    value={filters.category ?? ""}
                    onChange={(event) => changeFilter("category", event.target.value)}
                  >
                    <option value="">All categories</option>
                    {selected.categories.map((value) => (
                      <option key={value} value={value}>
                        {label(value)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {state === "loading" ? (
            <AdminTableLoadingState message="Loading report data…" />
          ) : state === "error" || !report ? (
            <AdminTableErrorState
              message="We could not load this report preview."
              onRetry={() => void load()}
            />
          ) : report.items.length === 0 ? (
            <AdminTableEmptyState
              title="No records found"
              description="No entries matched the current report filters."
            />
          ) : (
            <AdminTable minWidth="min-w-[60rem]">
              <AdminTableHeader>
                <AdminTableRow>
                  {report.columns.map((column) => (
                    <AdminTableHeaderCell key={column.key}>{column.label}</AdminTableHeaderCell>
                  ))}
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {report.items.map((row, index) => (
                  <AdminTableRow key={selected.domain + "-" + report.page + "-" + index}>
                    {report.columns.map((column) => (
                      <AdminTableCell key={column.key}>{row[column.key] ?? "—"}</AdminTableCell>
                    ))}
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          )}

          {state === "ready" && report && (
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
              <span>
                {report.total} result{report.total === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
                  disabled={report.page <= 1}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: Math.max(1, current.page - 1),
                    }))
                  }
                >
                  Previous
                </button>
                <span>
                  Page {report.page} of {report.totalPages}
                </span>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
                  disabled={!report.totalPages || report.page >= report.totalPages}
                  onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <AdminTableEmptyState
          title="No reports permitted"
          description="Your administrator role does not have permission to view any report domain."
        />
      )}
    </div>
  );
}
