import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Additive only. No historical backfill and no change to submission status/track tables.
  pgm.sql(`
    CREATE TABLE abstract_ai_jobs (
      id uuid PRIMARY KEY,
      abstract_submission_id uuid NOT NULL REFERENCES abstract_submissions(id) ON DELETE CASCADE,
      source_history_id uuid NOT NULL REFERENCES abstract_submission_history(id) ON DELETE CASCADE,
      rubric jsonb NOT NULL,
      rubric_hash char(64) NOT NULL,
      prompt_version varchar(80) NOT NULL,
      model varchar(120) NOT NULL,
      status varchar(16) NOT NULL DEFAULT 'QUEUED'
        CHECK (status IN ('QUEUED','PROCESSING','COMPLETED','FAILED','OUTDATED')),
      attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
      max_attempts smallint NOT NULL CHECK (max_attempts BETWEEN 1 AND 5),
      failure_code varchar(64),
      retry_allowed boolean NOT NULL DEFAULT false,
      next_attempt_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      lease_token uuid,
      lease_expires_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at timestamptz,
      UNIQUE (source_history_id, rubric_hash, prompt_version, model)
    );
    CREATE INDEX abstract_ai_jobs_due ON abstract_ai_jobs(status, next_attempt_at);
    CREATE INDEX abstract_ai_jobs_submission ON abstract_ai_jobs(abstract_submission_id, created_at);
    CREATE TABLE abstract_ai_attempts (
      id uuid PRIMARY KEY,
      job_id uuid NOT NULL REFERENCES abstract_ai_jobs(id) ON DELETE CASCADE,
      attempt_number smallint NOT NULL,
      reserved_usd numeric(16,8) NOT NULL CHECK (reserved_usd > 0),
      input_tokens integer,
      output_tokens integer,
      provider_request_id varchar(200),
      outcome varchar(64),
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at timestamptz,
      UNIQUE (job_id, attempt_number)
    );
    CREATE INDEX abstract_ai_attempts_created ON abstract_ai_attempts(created_at);
    CREATE TABLE abstract_ai_results (
      job_id uuid PRIMARY KEY REFERENCES abstract_ai_jobs(id) ON DELETE CASCADE,
      result jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE abstract_ai_events (
      id uuid PRIMARY KEY,
      job_id uuid NOT NULL REFERENCES abstract_ai_jobs(id) ON DELETE CASCADE,
      event_type varchar(64) NOT NULL,
      admin_id uuid REFERENCES admins(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX abstract_ai_events_job ON abstract_ai_events(job_id, created_at);
  `);
}
export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("abstract_ai_events");
  pgm.dropTable("abstract_ai_results");
  pgm.dropTable("abstract_ai_attempts");
  pgm.dropTable("abstract_ai_jobs");
}
