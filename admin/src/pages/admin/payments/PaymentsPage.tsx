import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
  getAdminPayments,
  getManualPaymentEligibility,
  recordManualPayment,
  reconcileAdminPayments,
  type AdminPayment,
  type PaymentCurrency,
  type PaymentTransactionStatus,
} from "@/services/payment/paymentAdminService";

const inputClass =
  "h-11 w-full rounded-[9px] border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none transition-colors placeholder:text-slate-400";

function formatAmount(item: Pick<AdminPayment, "currency" | "amountMinor">) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: item.currency }).format(
    item.amountMinor / 100,
  );
}

export function PaymentsPage() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManage = admin?.permissions.includes("payments.manage") ?? false;
  const initialStatus = (searchParams.get("status") as PaymentTransactionStatus) || undefined;
  const initialCurrency = (searchParams.get("currency") as PaymentCurrency) || undefined;
  const [filters, setFilters] = useState<{
    search?: string;
    status?: PaymentTransactionStatus;
    currency?: PaymentCurrency;
  }>({
    status: initialStatus,
    currency: initialCurrency,
  });
  const [items, setItems] = useState<AdminPayment[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const requestSequence = useRef(0);
  const hasLoaded = useRef(false);
  const lastAutomaticRefresh = useRef(0);
  const [reconciliationMessage, setReconciliationMessage] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualState, setManualState] = useState<"idle" | "checking" | "ready" | "saving">("idle");
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [manual, setManual] = useState({
    registrationReference: "",
    method: "BANK_TRANSFER" as "BANK_TRANSFER" | "OFFLINE",
    currency: "NGN" as PaymentCurrency,
    amountMinor: 0,
    externalReference: "",
    paymentDate: new Date().toISOString().slice(0, 16),
    payerName: "",
    internalNote: "",
  });

  const load = useCallback(
    async (showLoading = false) => {
      const sequence = ++requestSequence.current;
      if (showLoading) setState("loading");
      else setRefreshing(true);
      const result = await getAdminPayments(filters);
      if (sequence !== requestSequence.current) return;
      setRefreshing(false);
      if (!result.ok) {
        if (showLoading || !hasLoaded.current || result.status === 401 || result.status === 403) {
          if (result.status === 401 || result.status === 403) {
            setItems([]);
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
      setItems(result.payments.items);
      setState("ready");
    },
    [filters],
  );

  useEffect(() => {
    void load(true);
    return () => {
      requestSequence.current += 1;
    };
  }, [load]);

  useEffect(() => {
    const nextStatus = (searchParams.get("status") as PaymentTransactionStatus) || undefined;
    const nextCurrency = (searchParams.get("currency") as PaymentCurrency) || undefined;
    if (nextStatus !== filters.status || nextCurrency !== filters.currency) {
      setFilters((prev) => ({
        ...prev,
        status: nextStatus,
        currency: nextCurrency,
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.hidden || Date.now() - lastAutomaticRefresh.current < 1000) return;
      lastAutomaticRefresh.current = Date.now();
      void load();
    };
    const interval = window.setInterval(refreshIfVisible, 30_000);
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
    };
  }, [load]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Finance / Payments"
        title="Payments"
        description="View and verify delegate payment records and confirmations."
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <button
                className="h-10 rounded-[9px] bg-[#173D2D] px-4 text-xs font-semibold text-white hover:bg-[#102C20]"
                type="button"
                onClick={() => setManualOpen((current) => !current)}
              >
                Record manual payment
              </button>
              <button
                className="h-10 rounded-[9px] border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={() => {
                  setReconciliationMessage("Reconciling eligible attempts…");
                  void reconcileAdminPayments().then((result) => {
                    if (!result.ok) {
                      setReconciliationMessage("Reconciliation could not be completed.");
                      return;
                    }
                    setReconciliationMessage(
                      `Checked ${result.summary.examined}; ${result.summary.authoritative} settled, ${result.summary.duplicateSuccess} duplicate, ${result.summary.providerErrors} provider errors.`,
                    );
                    void load();
                  });
                }}
              >
                Reconcile eligible attempts
              </button>
            </div>
          ) : undefined
        }
      />
      {manualOpen ? (
        <form
          className="rounded-[14px] border border-emerald-200 bg-emerald-50/40 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (manualState !== "ready") return;
            setManualState("saving");
            setManualMessage("Recording payment for independent confirmation…");
            void recordManualPayment({
              ...manual,
              paymentDate: new Date(manual.paymentDate).toISOString(),
              ...(manual.payerName ? { payerName: manual.payerName } : {}),
              ...(manual.internalNote ? { internalNote: manual.internalNote } : {}),
            }).then((result) => {
              if (!result.ok) {
                setManualState("ready");
                setManualMessage("The manual payment could not be recorded.");
                return;
              }
              void navigate(`/admin/payments/${result.payment.paymentReference}`);
            });
          }}
        >
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900">Manual / offline payment</h2>
            <p className="mt-1 text-xs text-slate-600">
              Record a bank transfer or offline payment first. A separate confirmation step marks it as paid.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-semibold text-slate-700">
              Registration reference
              <input
                className={`${inputClass} mt-1`}
                required
                pattern="AIAIAC-DEL-[A-Z0-9]{8}"
                value={manual.registrationReference}
                onChange={(event) => {
                  setManual((current) => ({
                    ...current,
                    registrationReference: event.target.value.toUpperCase(),
                    amountMinor: 0,
                  }));
                  setManualState("idle");
                }}
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Currency
              <select
                className={`${inputClass} mt-1`}
                value={manual.currency}
                onChange={(event) => {
                  setManual((current) => ({
                    ...current,
                    currency: event.target.value as PaymentCurrency,
                    amountMinor: 0,
                  }));
                  setManualState("idle");
                }}
              >
                <option value="NGN">NGN</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                className="h-11 w-full rounded-[9px] border border-emerald-700 px-4 text-xs font-semibold text-emerald-800 disabled:opacity-50"
                disabled={manualState === "checking" || !manual.registrationReference}
                type="button"
                onClick={() => {
                  setManualState("checking");
                  setManualMessage("Checking server-side eligibility and price…");
                  void getManualPaymentEligibility(
                    manual.registrationReference,
                    manual.currency,
                  ).then((result) => {
                    if (!result.ok) {
                      setManualState("idle");
                      setManualMessage("Registration could not be located.");
                      return;
                    }
                    if (!result.eligibility.eligible || result.eligibility.amountMinor === null) {
                      setManualState("idle");
                      setManualMessage(
                        `Not eligible: ${result.eligibility.reason ?? "authoritative price unavailable"}.`,
                      );
                      return;
                    }
                    setManual((current) => ({
                      ...current,
                      amountMinor: result.eligibility.amountMinor!,
                    }));
                    setManualState("ready");
                    setManualMessage(
                      `${result.eligibility.delegateName} — ${result.eligibility.packageName} — ${formatAmount({ currency: result.eligibility.currency, amountMinor: result.eligibility.amountMinor! })}`,
                    );
                  });
                }}
              >
                {manualState === "checking" ? "Checking…" : "Check eligibility"}
              </button>
            </div>
            <label className="text-xs font-semibold text-slate-700">
              Verified amount
              <input
                className={`${inputClass} mt-1 bg-slate-50`}
                readOnly
                value={manual.amountMinor ? (manual.amountMinor / 100).toFixed(2) : ""}
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Method
              <select
                className={`${inputClass} mt-1`}
                value={manual.method}
                onChange={(event) =>
                  setManual((current) => ({
                    ...current,
                    method: event.target.value as "BANK_TRANSFER" | "OFFLINE",
                  }))
                }
              >
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="OFFLINE">Offline payment</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700">
              External reference
              <input
                className={`${inputClass} mt-1`}
                required
                maxLength={120}
                value={manual.externalReference}
                onChange={(event) =>
                  setManual((current) => ({ ...current, externalReference: event.target.value }))
                }
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Payment date
              <input
                className={`${inputClass} mt-1`}
                required
                type="datetime-local"
                value={manual.paymentDate}
                onChange={(event) =>
                  setManual((current) => ({ ...current, paymentDate: event.target.value }))
                }
              />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Payer / company (optional)
              <input
                className={`${inputClass} mt-1`}
                maxLength={160}
                value={manual.payerName}
                onChange={(event) =>
                  setManual((current) => ({ ...current, payerName: event.target.value }))
                }
              />
            </label>
          </div>
          <label className="mt-3 block text-xs font-semibold text-slate-700">
            Internal note (optional)
            <textarea
              className="mt-1 min-h-20 w-full rounded-[9px] border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none"
              maxLength={1000}
              value={manual.internalNote}
              onChange={(event) =>
                setManual((current) => ({ ...current, internalNote: event.target.value }))
              }
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-700" role="status">
              {manualMessage}
            </p>
            <button
              className="h-10 rounded-[9px] bg-[#173D2D] px-4 text-xs font-semibold text-white disabled:opacity-50"
              disabled={manualState !== "ready" || !manual.externalReference}
              type="submit"
            >
              Record for confirmation
            </button>
          </div>
        </form>
      ) : null}
      {reconciliationMessage ? (
        <p
          className="rounded-[9px] border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-700"
          role="status"
        >
          {reconciliationMessage}
        </p>
      ) : null}
      <form
        className="rounded-[14px] border border-slate-200 bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-[320px]">
            <Search
              className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              className={`${inputClass} pl-9`}
              aria-label="Search payments"
              placeholder="Reference, name or email"
              value={filters.search ?? ""}
              onChange={(event) =>
                setFilters((current) => {
                  const next = { ...current };
                  if (event.target.value) next.search = event.target.value;
                  else delete next.search;
                  return next;
                })
              }
            />
          </div>
          <select
            className={`${inputClass} w-full sm:w-[190px]`}
            aria-label="Payment status filter"
            value={filters.status ?? ""}
            onChange={(event) =>
              setFilters((current) => {
                const next = { ...current };
                if (event.target.value)
                  next.status = event.target.value as PaymentTransactionStatus;
                else delete next.status;
                return next;
              })
            }
          >
            <option value="">All statuses</option>
            {[
              "INITIALIZED",
              "PENDING",
              "PENDING_CONFIRMATION",
              "PAID",
              "FAILED",
              "ABANDONED",
              "REVERSED",
              "DUPLICATE_SUCCESS",
              "RECONCILIATION_REQUIRED",
            ].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <select
            className={`${inputClass} w-full sm:w-[180px]`}
            aria-label="Currency filter"
            value={filters.currency ?? ""}
            onChange={(event) =>
              setFilters((current) => {
                const next = { ...current };
                if (event.target.value) next.currency = event.target.value as PaymentCurrency;
                else delete next.currency;
                return next;
              })
            }
          >
            <option value="">All currencies</option>
            <option value="USD">USD</option>
            <option value="NGN">NGN</option>
          </select>
          <button
            className="h-11 w-full rounded-[10px] bg-[#173D2D] px-[18px] text-sm font-semibold text-white transition-colors hover:bg-[#102C20] sm:w-auto"
            type="submit"
          >
            Apply filters
          </button>
          {(filters.search || filters.status || filters.currency) && (
            <button
              className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-[18px] text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 sm:w-auto"
              type="button"
              onClick={() => {
                setFilters({});
                setSearchParams({});
              }}
            >
              Reset
            </button>
          )}
          <button
            className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-[18px] text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
            type="button"
            disabled={refreshing}
            onClick={() => void load()}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </form>

      {refreshError && state === "ready" ? (
        <p className="text-xs font-medium text-amber-800" role="status">
          Could not refresh payments. Showing the last loaded results.
        </p>
      ) : null}

      {state === "loading" ? (
        <AdminTableLoadingState message="Loading payments…" />
      ) : state === "error" ? (
        <AdminTableErrorState message="We could not load payments." onRetry={load} />
      ) : items.length === 0 ? (
        <AdminTableEmptyState
          title="No payments found"
          description="No payment attempts match these filters."
        />
      ) : (
        <AdminTable minWidth="min-w-[70rem]">
          <AdminTableHeader>
            <tr>
              {[
                "Payment reference",
                "Registration",
                "Delegate",
                "Email address",
                "Package",
                "Amount",
                "Status",
                "Source / method",
                "Date",
              ].map((label) => (
                <AdminTableHeaderCell key={label}>{label}</AdminTableHeaderCell>
              ))}
            </tr>
          </AdminTableHeader>
          <AdminTableBody>
            {items.map((item) => (
              <AdminTableRow key={item.id}>
                <AdminTableCell>
                  <Link
                    className="font-semibold text-[#05190F] hover:underline"
                    to={`/admin/payments/${item.paymentReference}`}
                  >
                    {item.paymentReference}
                  </Link>
                </AdminTableCell>
                <AdminTableCell className="font-mono text-xs text-slate-600">
                  {item.registrationReference}
                </AdminTableCell>
                <AdminTableCell>
                  <span className="font-semibold text-slate-900">{item.delegateName}</span>
                </AdminTableCell>
                <AdminTableCell className="text-xs text-slate-600">
                  <a className="hover:underline" href={`mailto:${item.delegateEmail}`}>
                    {item.delegateEmail}
                  </a>
                </AdminTableCell>
                <AdminTableCell className="text-xs text-slate-600">
                  {item.packageName}
                </AdminTableCell>
                <AdminTableCell className="font-semibold text-slate-900">
                  {formatAmount(item)}{" "}
                  <span className="text-[11px] font-normal text-slate-500">{item.currency}</span>
                </AdminTableCell>
                <AdminTableCell>
                  <AdminStatusBadge status={item.status} />
                </AdminTableCell>
                <AdminTableCell className="text-xs text-slate-600">
                  {item.paymentSource} / {item.paymentMethod}
                </AdminTableCell>
                <AdminTableCell className="whitespace-nowrap text-xs text-slate-500 font-medium">
                  {new Date(item.createdAt).toLocaleString("en-GB", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}
    </div>
  );
}
