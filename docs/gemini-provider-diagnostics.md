# Gemini provider diagnostics

The shared Gemini adapter records an allowlisted configuration object and its stable
SHA-256 fingerprint: model, installed SDK version, timeout, output-token cap and LOW
thinking level. API keys and other environment values are not fingerprint inputs.
Installed SDK metadata is read locally; unavailable metadata is labelled `unknown`.

Structured `Gemini request diagnostics` logs record elapsed milliseconds, configuration
and safe status/category on a received response or failed transport call. Received-response
logs describe transport completion, not successful evaluation/schema validation. Logging
failure is optional and cannot fail a submission or change analysis/retry behavior.

Failed attempts include the same allowlisted metadata in the existing error diagnostics.
Synthetic journals preserve these fields. Application worker failure logs correlate them
with the existing job ID. Existing PostgreSQL HTTP diagnostic events remain unchanged;
full fingerprints/durations are retained in process logs, not new database columns.
No historical attempt is backfilled or rewritten.

HTTP status takes precedence: 503 and 504 remain SERVER_ERROR with distinct status values,
OUTCOME_UNKNOWN and no automatic retry. The adapter's own timer remains TIMEOUT.
Recognized SDK timeout names and network timeout codes (including bounded nested causes)
are SDK_TIMEOUT. Recognized statusless network errors are TRANSPORT_ERROR; otherwise the
existing missing/invalid HTTP status labels apply. No arbitrary error messages, headers,
response bodies, personal details or abstract content are inspected for classification.
Property getters are not invoked; cause traversal is bounded to three objects.

Only fixed categories, validated configuration fields, elapsed duration and SHA-256
fingerprints can enter diagnostic output. The schema remains backward-compatible with
older diagnostics lacking these optional fields. Unrecognized fields remain rejected.

Validation: 110 focused mocked provider/evaluation/application-worker/analysis tests passed.
Coverage includes HTTP 503/504, timeout/status precedence, SDK and nested transport timeout,
missing/malformed status, secret exclusion, stable credential-independent fingerprints,
success diagnostics and existing no-retry/journal safeguards. Backend TypeScript checks
and build passed. Changed files were formatted with Prettier. No external provider call,
production setting change, model/rubric/request-parameter change or deployment occurred.
