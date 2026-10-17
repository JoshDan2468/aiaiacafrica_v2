import { useRef, useState } from "react";
import {
  importApprovedCommercialApplications,
  type CommercialImportSummary,
} from "@/services/commercialApplication/commercialApplicationAdminService";
import type { CommercialApplicationKind } from "@/services/commercialApplication/commercialApplicationTypes";

const input = "mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white p-3 text-sm";
const button =
  "min-h-11 rounded-md bg-[#173D2D] px-4 text-sm font-semibold text-white disabled:opacity-50";

export function CommercialApprovedImport({
  kind,
  onImported,
}: {
  kind: CommercialApplicationKind;
  onImported: () => void;
}) {
  const fileReadGeneration = useRef(0);
  const [csv, setCsv] = useState("");
  const [source, setSource] = useState("");
  const [approvalEvidence, setApprovalEvidence] = useState("");
  const [summary, setSummary] = useState<CommercialImportSummary | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const reset = () => {
    setSummary(null);
    setAcknowledged(false);
    setCompleted(false);
    setError("");
  };
  const request = async (commit: boolean) => {
    if (!commit) setCompleted(false);
    setBusy(true);
    setError("");
    try {
      const result = await importApprovedCommercialApplications(
        kind,
        { csv, source, approvalEvidence, ...(commit ? { acknowledged: true as const } : {}) },
        commit,
      );
      if (!result.ok || !result.data) {
        setError(result.error ?? "Import could not be completed.");
        return;
      }
      setSummary(result.data.data.summary);
      if (commit) {
        setCompleted(true);
        setAcknowledged(false);
        onImported();
      }
    } catch {
      setError("Import could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="rounded-lg border border-slate-200 bg-white p-5">
      <summary className="cursor-pointer text-sm font-bold text-[#173D2D]">
        Import approved {kind === "SPONSOR" ? "sponsors" : "exhibitors"}
      </summary>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Import organizations already approved outside this platform. Each valid row becomes a
        confirmed commercial record with approval evidence. Existing applications are skipped. This
        does not send email, grant marketing consent or create payments and Event Passes.
      </p>
      <p className="mt-3 text-xs leading-6 text-slate-600">
        CSV required headers:
        organizationName,country,contactFirstName,contactLastName,contactEmail,contactPhone,packageCode.
        Optional: website,industry,contactJobTitle,notes. Maximum 50 rows and 75 KiB. Package codes:{" "}
        {kind === "SPONSOR"
          ? "TITLE, STRATEGIC, DIAMOND, PLATINUM, GOLD, SILVER"
          : "9_SQM, 18_SQM, 36_SQM"}
        .
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Import source
          <input
            disabled={busy}
            className={input}
            required
            minLength={3}
            maxLength={200}
            value={source}
            onChange={(event) => {
              reset();
              setSource(event.target.value);
            }}
          />
        </label>
        <label className="text-sm font-semibold">
          Manual approval evidence
          <input
            disabled={busy}
            className={input}
            required
            minLength={10}
            maxLength={1000}
            value={approvalEvidence}
            onChange={(event) => {
              reset();
              setApprovalEvidence(event.target.value);
            }}
          />
        </label>
      </div>
      <label className="mt-4 block text-sm font-semibold">
        Approved organizations CSV
        <input
          className={input}
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(event) => {
            const generation = ++fileReadGeneration.current;
            reset();
            setCsv("");
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 75 * 1024) {
              setError("CSV exceeds the 75 KiB limit.");
              return;
            }
            void file
              .text()
              .then((text) => {
                if (generation !== fileReadGeneration.current) return;
                reset();
                setCsv(text);
              })
              .catch(() => {
                if (generation === fileReadGeneration.current) setError("CSV could not be read.");
              });
          }}
        />
      </label>
      <button
        className={`${button} mt-4`}
        type="button"
        disabled={busy || !csv || source.trim().length < 3 || approvalEvidence.trim().length < 10}
        onClick={() => void request(false)}
      >
        Preview import
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-800">
          {error}
        </p>
      )}
      {summary && (
        <section className="mt-4 space-y-3 text-sm" aria-label="Import preview">
          <p role="status">
            {summary.valid} valid · {summary.imported} imported · {summary.skipped} skipped ·{" "}
            {summary.invalid} invalid
          </p>
          {summary.errors.length > 0 && (
            <ul className="list-disc pl-5 text-rose-800">
              {summary.errors.map((item, index) => (
                <li key={`${item.row}-${index}`}>
                  Row {item.row}: {item.reason}
                </li>
              ))}
            </ul>
          )}
          <ul className="max-h-48 overflow-auto divide-y divide-slate-100">
            {summary.rows.map((row) => (
              <li className="py-2" key={row.row}>
                {row.organizationName} · {row.contactEmail} · {row.packageCode}
              </li>
            ))}
          </ul>
          {!completed && (
            <>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                />
                I confirm these organizations have been approved and the source and approval
                evidence are accurate.
              </label>
              <button
                className={button}
                type="button"
                disabled={busy || !acknowledged || summary.invalid > 0 || summary.valid === 0}
                onClick={() => void request(true)}
              >
                Import {summary.valid} approved organizations
              </button>
            </>
          )}
          {completed && (
            <p role="status" className="text-emerald-800">
              Import completed. Review each imported record in the application list.
            </p>
          )}
        </section>
      )}
    </details>
  );
}
