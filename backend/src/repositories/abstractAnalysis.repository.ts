import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { getDatabasePool, withTransaction } from "../config/database";
import { geminiPricingIsCurrent, type AbstractAiConfig } from "../config/abstractAi";
import { providerDiagnosticsSchema, type ProviderDiagnostics } from "../abstracts/analysisProvider";
import {
  promptVersion,
  rubricFingerprint,
  type AnalysisContent,
  type AnalysisResult,
  type AnalysisRubric,
  type AnalysisView,
} from "../abstracts/analysis";
import type { DatabaseExecutor, TransactionRunner } from "../types/database";

export interface AnalysisClaim {
  id: string;
  leaseToken: string;
  attemptId: string;
  attempt: number;
  model: string;
  rubric: AnalysisRubric;
  content: AnalysisContent;
  identity: string[];
}
export interface AnalysisUsage {
  requestId: string | null;
  inputTokens: number;
  outputTokens: number;
}
export interface AbstractAnalysisRepository {
  enqueue(client: DatabaseExecutor, submissionId: string, historyId: string): Promise<void>;
  views(references: readonly string[]): Promise<Record<string, AnalysisView>>;
  reconcile?(): Promise<number>;
  claim(): Promise<AnalysisClaim | null>;
  complete(claim: AnalysisClaim, result: AnalysisResult, usage: AnalysisUsage): Promise<boolean>;
  fail(
    claim: AnalysisClaim,
    code: string,
    retry: boolean,
    usage?: AnalysisUsage,
    diagnostics?: ProviderDiagnostics,
  ): Promise<void>;
  retry(reference: string, adminId: string): Promise<boolean>;
}
async function event(
  client: DatabaseExecutor,
  jobId: string,
  type: string,
  adminId: string | null = null,
) {
  await client.query(
    "INSERT INTO abstract_ai_events(id,job_id,event_type,admin_id) VALUES($1,$2,$3,$4)",
    [randomUUID(), jobId, type, adminId],
  );
}
interface JobRow extends QueryResultRow {
  id: string;
  abstract_submission_id: string;
  source_history_id: string;
  model: string;
  rubric: AnalysisRubric;
  attempts: number;
  max_attempts: number;
  status: AnalysisView["status"];
  failure_code: string | null;
  retry_allowed: boolean;
  prompt_version: string;
  created_at: Date;
  completed_at: Date | null;
}
export function createAbstractAnalysisRepository(
  config: AbstractAiConfig,
  executor?: DatabaseExecutor,
  transaction: TransactionRunner = withTransaction,
): AbstractAnalysisRepository {
  const database = () => {
    const selected = executor ?? getDatabasePool();
    if (!selected) throw new Error("Database is not configured");
    return selected;
  };
  const reservation =
    Math.ceil(
      ((config.maxInputTokens * config.inputUsdPerMillion +
        config.maxOutputTokens * config.outputUsdPerMillion) /
        1_000_000) *
        100_000_000,
    ) / 100_000_000;
  async function lockSubmission(client: PoolClient, id: string) {
    await client.query("SELECT id FROM abstract_submissions WHERE id=$1 FOR UPDATE", [id]);
  }
  return {
    async enqueue(client, submissionId, historyId) {
      // Caller owns the submission lock/transaction. Earlier revisions retain their results.
      const previous = await client.query<{ id: string }>(
        "UPDATE abstract_ai_jobs SET status='OUTDATED', retry_allowed=false WHERE abstract_submission_id=$1 AND source_history_id<>$2 AND status<>'OUTDATED' RETURNING id",
        [submissionId, historyId],
      );
      for (const row of previous.rows) await event(client, row.id, "OUTDATED");
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO abstract_ai_jobs(id,abstract_submission_id,source_history_id,rubric,rubric_hash,prompt_version,model,max_attempts)
         VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8)
         ON CONFLICT(source_history_id,rubric_hash,prompt_version,model) DO NOTHING RETURNING id`,
        [
          randomUUID(),
          submissionId,
          historyId,
          JSON.stringify(config.rubric),
          rubricFingerprint(config.rubric),
          promptVersion,
          config.model,
          config.maxAttempts,
        ],
      );
      if (inserted.rows[0]) await event(client, inserted.rows[0].id, "QUEUED");
    },
    async reconcile() {
      return transaction(async (client) => {
        // Only explicit submission-time intent markers, never unmarked historical/disabled submissions.
        const missing = await client.query<{ id: string; history_id: string }>(
          `SELECT a.id,h.id AS history_id FROM abstract_submissions a
           JOIN abstract_submission_history h ON h.abstract_submission_id=a.id
           JOIN abstract_events e ON e.abstract_submission_id=a.id
             AND e.details->>'aiRequestedHistoryId'=h.id::text
             AND e.event_type IN ('ABSTRACT_SUBMITTED','ABSTRACT_RESUBMITTED')
           WHERE a.status IN ('SUBMITTED','UNDER_REVIEW') AND a.submitted_at=h.created_at
             AND a.title=h.title_snapshot AND a.abstract_body=h.abstract_body_snapshot
             AND a.keywords IS NOT DISTINCT FROM h.keywords_snapshot
             AND h.action IN ('SUBMITTED','RESUBMITTED')
             AND NOT EXISTS(SELECT 1 FROM abstract_ai_jobs j WHERE j.source_history_id=h.id)
           ORDER BY h.created_at,a.id LIMIT 25 FOR UPDATE OF a SKIP LOCKED`,
        );
        for (const row of missing.rows) await this.enqueue(client, row.id, row.history_id);
        return missing.rows.length;
      });
    },
    async views(references) {
      if (!references.length) return {};
      const rows = await database().query<
        JobRow & { reference: string; result: AnalysisResult | null; content_current: boolean }
      >(
        `SELECT DISTINCT ON (a.reference) j.*, a.reference, r.result,
          (a.submitted_at=h.created_at AND a.title=h.title_snapshot AND a.abstract_body=h.abstract_body_snapshot
           AND a.keywords IS NOT DISTINCT FROM h.keywords_snapshot) AS content_current
         FROM abstract_submissions a JOIN abstract_ai_jobs j ON j.abstract_submission_id=a.id
         JOIN abstract_submission_history h ON h.id=j.source_history_id
         LEFT JOIN abstract_ai_results r ON r.job_id=j.id WHERE a.reference=ANY($1::varchar[])
         ORDER BY a.reference, (j.status<>'OUTDATED') DESC, j.created_at DESC, j.id DESC`,
        [references],
      );
      return Object.fromEntries(
        rows.rows.map((row) => [
          row.reference,
          {
            status: row.content_current ? row.status : "OUTDATED",
            canRetry:
              row.content_current &&
              row.status === "FAILED" &&
              row.retry_allowed &&
              row.attempts < row.max_attempts,
            ...(row.failure_code ? { failureCode: row.failure_code } : {}),
            ...(row.result ? { result: row.result } : {}),
            sourceRevision: row.source_history_id,
            rubric: row.rubric,
            promptVersion: row.prompt_version,
            model: row.model,
            createdAt: row.created_at,
            completedAt: row.completed_at,
          } satisfies AnalysisView,
        ]),
      );
    },
    async claim() {
      return transaction(async (client) => {
        // Global claim lock serializes reservations and enforces concurrency/rate/budgets across workers.
        await client.query("SELECT pg_advisory_xact_lock(2027,1401)");
        const expired = await client.query<{ id: string }>(
          `UPDATE abstract_ai_jobs SET status='FAILED',failure_code='OUTCOME_UNKNOWN',retry_allowed=false
           WHERE status='PROCESSING' AND lease_expires_at<CURRENT_TIMESTAMP RETURNING id`,
        );
        for (const row of expired.rows) {
          await client.query(
            "UPDATE abstract_ai_attempts SET outcome='OUTCOME_UNKNOWN',finished_at=CURRENT_TIMESTAMP WHERE job_id=$1 AND finished_at IS NULL",
            [row.id],
          );
          await event(client, row.id, "OUTCOME_UNKNOWN");
        }
        if (config.provider === "gemini") {
          if (!geminiPricingIsCurrent(config)) return null;
          // Retain worst-case reservations and pause all Gemini dispatch until usage is reconciled.
          // Unknown usage must never silently become zero or permit a blind paid retry.
          const uncertain = await client.query<{ blocked: boolean }>(
            `SELECT EXISTS(SELECT 1 FROM abstract_ai_attempts t JOIN abstract_ai_jobs j ON j.id=t.job_id
              WHERE j.model=$1 AND t.finished_at IS NOT NULL AND
                (t.input_tokens IS NULL OR t.output_tokens IS NULL OR
                 t.outcome IN ('OUTCOME_UNKNOWN','USAGE_UNVERIFIED'))) AS blocked`,
            [config.model],
          );
          if (uncertain.rows[0]?.blocked !== false) return null;
        }
        const capacity = await client.query<{ active: string; recent: string }>(
          `SELECT (SELECT count(*) FROM abstract_ai_jobs j JOIN abstract_ai_attempts t ON t.job_id=j.id
             WHERE j.lease_expires_at>CURRENT_TIMESTAMP AND t.finished_at IS NULL)::text AS active,
           (SELECT count(*) FROM abstract_ai_attempts WHERE created_at>CURRENT_TIMESTAMP-interval '1 minute')::text AS recent`,
        );
        if (
          !capacity.rows[0] ||
          ![capacity.rows[0].active, capacity.rows[0].recent].every(
            (value) =>
              typeof value === "string" &&
              /^\d+$/.test(value) &&
              Number.isSafeInteger(Number(value)),
          )
        )
          return null;
        if (
          Number(capacity.rows[0]?.active) >= config.maxConcurrent ||
          Number(capacity.rows[0]?.recent) >= config.requestsPerMinute
        )
          return null;
        const due = await client.query<JobRow>(
          `SELECT * FROM abstract_ai_jobs WHERE status='QUEUED' AND next_attempt_at<=CURRENT_TIMESTAMP
           AND attempts<max_attempts ORDER BY next_attempt_at,id FOR UPDATE SKIP LOCKED LIMIT 1`,
        );
        const job = due.rows[0];
        if (!job) return null;
        // Also guard revisions submitted while the feature was disabled; never backfill them.
        const current = await client.query<{ current: boolean }>(
          `SELECT (a.submitted_at=h.created_at) AS current FROM abstract_submissions a
           JOIN abstract_submission_history h ON h.id=$2 WHERE a.id=$1`,
          [job.abstract_submission_id, job.source_history_id],
        );
        if (!current.rows[0]?.current) {
          await client.query(
            "UPDATE abstract_ai_jobs SET status='OUTDATED',retry_allowed=false WHERE id=$1",
            [job.id],
          );
          await event(client, job.id, "OUTDATED");
          return null;
        }
        if (
          job.model !== config.model ||
          job.prompt_version !== promptVersion ||
          rubricFingerprint(job.rubric) !== rubricFingerprint(config.rubric)
        ) {
          await client.query(
            "UPDATE abstract_ai_jobs SET status='FAILED',failure_code='CONFIG_CHANGED',retry_allowed=false WHERE id=$1",
            [job.id],
          );
          await event(client, job.id, "CONFIG_CHANGED");
          return null;
        }
        const budget = await client.query<{ daily: string; total: string }>(
          `SELECT COALESCE(sum(reserved_usd) FILTER(WHERE created_at >= date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'),0)::text AS daily,
           COALESCE(sum(reserved_usd),0)::text AS total FROM abstract_ai_attempts`,
        );
        if (
          !budget.rows[0] ||
          ![budget.rows[0].daily, budget.rows[0].total].every(
            (value) =>
              typeof value === "string" &&
              value.trim() !== "" &&
              Number.isFinite(Number(value)) &&
              Number(value) >= 0,
          )
        )
          return null;
        if (!Number.isFinite(reservation) || reservation <= 0) return null;
        if (
          Number(budget.rows[0]?.daily) + reservation > config.dailyBudgetUsd ||
          Number(budget.rows[0]?.total) + reservation > config.totalBudgetUsd
        ) {
          await client.query(
            "UPDATE abstract_ai_jobs SET status='FAILED',failure_code='BUDGET_LIMIT',retry_allowed=true,next_attempt_at=CURRENT_TIMESTAMP+interval '1 minute' WHERE id=$1",
            [job.id],
          );
          await event(client, job.id, "BUDGET_LIMIT");
          return null;
        }
        const source = await client.query<
          QueryResultRow & {
            title_snapshot: string;
            abstract_body_snapshot: string;
            keywords_snapshot: string | null;
            identity: string[];
          }
        >(
          `SELECT h.title_snapshot,h.abstract_body_snapshot,h.keywords_snapshot,
           ARRAY[a.author_first_name,a.author_last_name,a.author_email,a.author_phone,a.organization_name,COALESCE(a.job_title,'')] AS identity
           FROM abstract_submission_history h JOIN abstract_submissions a ON a.id=h.abstract_submission_id
           WHERE h.id=$1`,
          [job.source_history_id],
        );
        const row = source.rows[0]!;
        const leaseToken = randomUUID();
        const attemptId = randomUUID();
        await client.query(
          "UPDATE abstract_ai_jobs SET status='PROCESSING',attempts=attempts+1,lease_token=$2,lease_expires_at=CURRENT_TIMESTAMP+($3*interval '1 millisecond'),failure_code=NULL,retry_allowed=false WHERE id=$1",
          [job.id, leaseToken, config.timeoutMs + 60000],
        );
        await client.query(
          "INSERT INTO abstract_ai_attempts(id,job_id,attempt_number,reserved_usd) VALUES($1,$2,$3,$4)",
          [attemptId, job.id, job.attempts + 1, reservation],
        );
        await event(client, job.id, "ATTEMPT_RESERVED");
        return {
          id: job.id,
          leaseToken,
          attemptId,
          attempt: job.attempts + 1,
          model: job.model,
          rubric: job.rubric,
          content: {
            title: row.title_snapshot,
            abstractBody: row.abstract_body_snapshot,
            keywords: row.keywords_snapshot,
          },
          identity: row.identity,
        };
      });
    },
    async complete(claim, result, usage) {
      return transaction(async (client) => {
        const source = await client.query<{ abstract_submission_id: string }>(
          "SELECT abstract_submission_id FROM abstract_ai_jobs WHERE id=$1",
          [claim.id],
        );
        if (!source.rows[0]) return false;
        await lockSubmission(client, source.rows[0].abstract_submission_id);
        const updated = await client.query(
          `UPDATE abstract_ai_jobs j SET status='COMPLETED',completed_at=CURRENT_TIMESTAMP,retry_allowed=false
           FROM abstract_submissions a, abstract_submission_history h
           WHERE j.id=$1 AND j.status='PROCESSING' AND j.lease_token=$2 AND j.lease_expires_at>CURRENT_TIMESTAMP
           AND a.id=j.abstract_submission_id AND h.id=j.source_history_id AND a.submitted_at=h.created_at RETURNING j.id`,
          [claim.id, claim.leaseToken],
        );
        const saved = Boolean(updated.rowCount);
        if (saved) {
          await client.query(
            "INSERT INTO abstract_ai_results(job_id,result) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING",
            [claim.id, JSON.stringify(result)],
          );
          await event(client, claim.id, "COMPLETED");
        } else await event(client, claim.id, "STALE_RESULT_DISCARDED");
        await client.query(
          "UPDATE abstract_ai_attempts SET outcome=$2,input_tokens=$3,output_tokens=$4,provider_request_id=$5,finished_at=CURRENT_TIMESTAMP WHERE id=$1 AND finished_at IS NULL",
          [
            claim.attemptId,
            saved ? "COMPLETED" : "STALE_RESULT_DISCARDED",
            usage.inputTokens,
            usage.outputTokens,
            usage.requestId,
          ],
        );
        return saved;
      });
    },
    async fail(claim, code, retry, usage, diagnostics) {
      await transaction(async (client) => {
        const delayed = retry
          ? Math.min(3600, 60 * 2 ** (claim.attempt - 1)) + Math.floor(Math.random() * 30)
          : 60;
        const updated = await client.query(
          `UPDATE abstract_ai_jobs SET status=CASE WHEN $3 AND attempts<max_attempts THEN 'QUEUED' ELSE 'FAILED' END,
           failure_code=$4,retry_allowed=$6,next_attempt_at=CURRENT_TIMESTAMP+($5*interval '1 second')
           WHERE id=$1 AND status='PROCESSING' AND lease_token=$2 AND lease_expires_at>CURRENT_TIMESTAMP RETURNING id`,
          [
            claim.id,
            claim.leaseToken,
            retry,
            code,
            delayed,
            retry || code === "INVALID_RESPONSE" || code === "PROVIDER_REFUSAL",
          ],
        );
        await client.query(
          "UPDATE abstract_ai_attempts SET outcome=$2,input_tokens=$3,output_tokens=$4,provider_request_id=$5,finished_at=CURRENT_TIMESTAMP WHERE id=$1 AND finished_at IS NULL",
          [
            claim.attemptId,
            code,
            usage?.inputTokens ?? null,
            usage?.outputTokens ?? null,
            usage?.requestId ?? null,
          ],
        );
        if (updated.rowCount) {
          await event(client, claim.id, code);
          const safe = providerDiagnosticsSchema.safeParse(diagnostics);
          if (safe.success)
            await event(
              client,
              claim.id,
              `HTTP_${safe.data.httpStatus ?? "UNKNOWN"}_${safe.data.category}`,
            );
        }
      });
    },
    async retry(reference, adminId) {
      return transaction(async (client) => {
        const source = await client.query<{ id: string }>(
          "SELECT id FROM abstract_submissions WHERE reference=$1 FOR UPDATE",
          [reference],
        );
        if (!source.rows[0]) return false;
        const updated = await client.query<{ id: string }>(
          `UPDATE abstract_ai_jobs j SET status='QUEUED',retry_allowed=false
           FROM abstract_submissions a, abstract_submission_history h
           WHERE a.id=$1 AND j.abstract_submission_id=a.id AND h.id=j.source_history_id
           AND j.status='FAILED' AND j.retry_allowed AND j.attempts<j.max_attempts AND j.next_attempt_at<=CURRENT_TIMESTAMP
           AND a.submitted_at=h.created_at
           AND a.title=h.title_snapshot AND a.abstract_body=h.abstract_body_snapshot
           AND a.keywords IS NOT DISTINCT FROM h.keywords_snapshot RETURNING j.id`,
          [source.rows[0].id],
        );
        if (updated.rows[0]) await event(client, updated.rows[0].id, "MANUAL_RETRY", adminId);
        return Boolean(updated.rowCount);
      });
    },
  };
}
