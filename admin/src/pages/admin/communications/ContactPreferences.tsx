import { useState } from "react";
import {
  communicationService,
  type Preference,
} from "@/services/communication/communicationService";

const field =
  "mt-1 block min-h-11 w-full rounded-[9px] border border-slate-300 bg-white px-3 py-2 text-sm";
const button =
  "min-h-11 rounded-[9px] border border-slate-300 px-4 text-sm font-semibold disabled:opacity-50";
export function ContactPreferences({
  canManage,
  onUpdated,
}: {
  canManage: boolean;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Preference[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [suppressed, setSuppressed] = useState(false);
  const [email, setEmail] = useState("");
  const [action, setAction] = useState("OPTED_IN");
  const [evidence, setEvidence] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = async (nextPage = page, only = suppressed) => {
    setError("");
    setBusy(true);
    try {
      const result = await communicationService.preferences(nextPage, only);
      setItems(result.items);
      setTotal(result.total);
      setPage(nextPage);
      setSuppressed(only);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Preferences could not be loaded");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-[14px] border border-slate-200 bg-white p-5">
      <button
        className={button}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (!open) void load(1);
        }}
      >
        Consent &amp; suppression preferences
      </button>
      {open && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-600">
            Marketing requires recorded opt-in evidence. Imports never replace existing preferences.
            Suppression excludes an address from all Communications Center campaigns; transactional
            security and payment messages remain separate.
          </p>
          {error && (
            <p role="alert" className="text-sm text-red-800">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-sm text-emerald-800">
              {message}
            </p>
          )}
          {canManage && (
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                setBusy(true);
                setError("");
                setMessage("");
                void communicationService
                  .setPreference({
                    email,
                    ...(action === "SUPPRESS"
                      ? { suppressed: true, reason: evidence }
                      : {
                          consent: action as "OPTED_IN" | "OPTED_OUT" | "UNKNOWN",
                          evidence,
                          ...(action === "OPTED_IN" ? { suppressed: false } : {}),
                        }),
                    ...(source ? { sourceLabel: source } : {}),
                  })
                  .then(async () => {
                    setMessage("Preferences updated and audited.");
                    onUpdated();
                    await load();
                  })
                  .catch((failure) => setError(String(failure)))
                  .finally(() => setBusy(false));
              }}
            >
              <label className="text-sm font-semibold">
                Preference email
                <input
                  className={field}
                  type="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="text-sm font-semibold">
                Preference action
                <select
                  className={field}
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                >
                  <option value="OPTED_IN">Record opt-in / restore with evidence</option>
                  <option value="OPTED_OUT">Record opt-out</option>
                  <option value="UNKNOWN">Consent unknown</option>
                  <option value="SUPPRESS">Suppress address</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Consent evidence or suppression reason
                <input
                  className={field}
                  required
                  minLength={3}
                  maxLength={action === "SUPPRESS" ? 200 : 500}
                  value={evidence}
                  onChange={(event) => setEvidence(event.target.value)}
                />
              </label>
              <label className="text-sm font-semibold">
                Contact source (optional)
                <input
                  className={field}
                  maxLength={200}
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                />
              </label>
              <button className={button} disabled={busy} type="submit">
                Save preferences
              </button>
            </form>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={suppressed}
              disabled={busy}
              onChange={(event) => void load(1, event.target.checked)}
            />
            Show suppressed and opted-out addresses only
          </label>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Consent</th>
                  <th>Suppressed</th>
                  <th>Source</th>
                  <th>Evidence / reason</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-3">{item.email}</td>
                    <td className="pr-3">{item.consent}</td>
                    <td>{item.suppressed ? "Yes" : "No"}</td>
                    <td>{item.sourceLabel ?? "—"}</td>
                    <td>{item.reason ?? item.evidence ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!items.length && <p className="text-sm">No recorded preferences.</p>}
          <div className="flex items-center gap-3 text-sm">
            <button
              className={button}
              disabled={busy || page <= 1}
              onClick={() => void load(page - 1)}
            >
              Previous preferences
            </button>
            <span>
              {total} preferences · Page {page}
            </span>
            <button
              className={button}
              disabled={busy || page * 25 >= total}
              onClick={() => void load(page + 1)}
            >
              Next preferences
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
