import { useEffect, useState } from "react";
import { ArrowLeft } from "@/components/admin/adminIcons";
import { Link, useParams } from "react-router-dom";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTableErrorState, AdminTableLoadingState } from "@/components/admin/AdminTable";
import { useAuth } from "@/hooks/useAuth";
import {
  confirmManualPayment,
  getAdminPayment,
  retryAdminPaymentCompletion,
  type AdminPaymentDetail,
} from "@/services/payment/paymentAdminService";

export function PaymentDetailPage() {
  const { admin } = useAuth();
  const canManage = admin?.permissions.includes("payments.manage") ?? false;
  const { reference } = useParams();
  const [payment, setPayment] = useState<AdminPaymentDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [completionState, setCompletionState] = useState<"idle" | "working" | "done" | "error">(
    "idle",
  );
  const [confirmationState, setConfirmationState] = useState<"idle" | "working" | "done" | "error">(
    "idle",
  );

  useEffect(() => {
    if (!reference) {
      setState("error");
      return;
    }
    void getAdminPayment(reference).then((result) => {
      if (!result.ok) setState("error");
      else {
        setPayment(result.payment);
        setState("ready");
      }
    });
  }, [reference]);

  if (state === "loading") return <AdminTableLoadingState message="Loading payment…" />;
  if (state === "error" || !payment)
    return <AdminTableErrorState message="We could not load this payment." />;

  const rows = [
    ["Registration", payment.registrationReference],
    ["Delegate", `${payment.delegateName} — ${payment.delegateEmail}`],
    ["Package", payment.packageName],
    [
      "Amount",
      `${payment.currency} ${(payment.amountMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    ],
    ["Payment source", payment.paymentSource],
    ["Payment method", payment.paymentMethod],
    ["Provider transaction", payment.providerTransactionId || "Not available"],
    ["Channel", payment.channel || "Not available"],
    ["Gateway response", payment.gatewayResponse || "Not available"],
    ["External reference", payment.externalReference || "Not applicable"],
    ["Payer / company", payment.payerName || "Not provided"],
    ["Internal note", payment.internalNote || "None"],
    ["Recorded by", payment.recordedByName || "Not applicable"],
    ["Confirmed by", payment.confirmedByName || "Not yet confirmed"],
    ["Provider status", payment.providerStatus || "Not observed"],
    ["Financial authority", payment.financialAuthority],
    ["Authoritative payment", payment.isAuthoritative ? "Yes" : "No"],
    ["Reconciliation reason", payment.reconciliationReason || "None"],
    ["Verification failure", payment.failureReason || "None"],
    ["Reconciliation attempts", String(payment.reconciliationAttempts)],
    ["Confirmation email", payment.confirmationEmailStatus],
  ];

  const retryCompletion = async () => {
    setCompletionState("working");
    const result = await retryAdminPaymentCompletion(payment.paymentReference);
    if (!result.ok) {
      setCompletionState("error");
      return;
    }
    const refreshed = await getAdminPayment(payment.paymentReference);
    if (refreshed.ok) setPayment(refreshed.payment);
    setCompletionState("done");
  };

  const confirmPayment = async () => {
    setConfirmationState("working");
    const result = await confirmManualPayment(payment.paymentReference);
    if (!result.ok) {
      setConfirmationState("error");
      return;
    }
    const refreshed = await getAdminPayment(payment.paymentReference);
    if (refreshed.ok) setPayment(refreshed.payment);
    setConfirmationState("done");
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-2.5 transition-colors"
          to="/admin/payments"
        >
          <ArrowLeft className="size-3.5" /> Payments
        </Link>
        <AdminPageHeader
          eyebrow="Finance / Payment record"
          title={payment.paymentReference}
          actions={
            <div className="flex items-center gap-3">
              {canManage &&
              payment.paymentSource === "MANUAL" &&
              payment.status === "PENDING_CONFIRMATION" ? (
                <button
                  className="rounded-md bg-[#173D2D] px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60"
                  disabled={confirmationState === "working"}
                  type="button"
                  onClick={() => void confirmPayment()}
                >
                  {confirmationState === "working" ? "Confirming…" : "Confirm payment"}
                </button>
              ) : null}
              {payment.status === "PAID" ? (
                <button
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 transition-colors shadow-2xs"
                  disabled={completionState === "working"}
                  type="button"
                  onClick={() => void retryCompletion()}
                >
                  {completionState === "working" ? "Processing…" : "Retry pass delivery"}
                </button>
              ) : null}
              <AdminStatusBadge status={payment.status} />
            </div>
          }
        />
      </div>

      {completionState === "done" ? (
        <p
          className="rounded-md bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-semibold text-emerald-800"
          role="status"
        >
          Completion workflow processed. Delivery status has been refreshed.
        </p>
      ) : null}
      {completionState === "error" ? (
        <p
          className="rounded-md bg-rose-50 border border-rose-200 px-3.5 py-2 text-xs font-semibold text-rose-800"
          role="alert"
        >
          The completion workflow could not be processed. Try again later.
        </p>
      ) : null}
      {confirmationState === "done" ? (
        <p
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800"
          role="status"
        >
          Manual payment confirmed as the authoritative payment. Completion processing was started.
        </p>
      ) : null}
      {confirmationState === "error" ? (
        <p
          className="rounded-md border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-800"
          role="alert"
        >
          Confirmation was refused. Refresh the record to review its current payment state.
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="font-sans text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            Transaction details
          </h2>
          <dl className="divide-y divide-slate-100 text-xs">
            {rows.map(([label, value]) => (
              <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr]" key={label}>
                <dt className="font-medium text-slate-500">{label}</dt>
                <dd className="font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="font-sans text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            {payment.paymentSource === "MANUAL"
              ? "Manual confirmation history"
              : "Gateway verification"}
          </h2>
          <dl className="divide-y divide-slate-100 text-xs">
            <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr]">
              <dt className="font-medium text-slate-500">Initialized At</dt>
              <dd className="font-semibold text-slate-900">
                {new Date(payment.createdAt).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </dd>
            </div>
            <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr]">
              <dt className="font-medium text-slate-500">Payment Date</dt>
              <dd className="font-semibold text-slate-900">
                {payment.paymentDate
                  ? new Date(payment.paymentDate).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "Not applicable"}
              </dd>
            </div>
            <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr]">
              <dt className="font-medium text-slate-500">Confirmed At</dt>
              <dd className="font-semibold text-slate-900">
                {payment.confirmedAt
                  ? new Date(payment.confirmedAt).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "Pending confirmation"}
              </dd>
            </div>
            <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr]">
              <dt className="font-medium text-slate-500">Paid At</dt>
              <dd className="font-semibold text-slate-900">
                {payment.paidAt
                  ? new Date(payment.paidAt).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "Not yet paid"}
              </dd>
            </div>
            <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr]">
              <dt className="font-medium text-slate-500">Audit Status</dt>
              <dd className="font-semibold text-slate-900">
                {payment.paymentSource === "MANUAL"
                  ? "Explicit Finance / Super Admin confirmation"
                  : "Authoritative server verification only"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
