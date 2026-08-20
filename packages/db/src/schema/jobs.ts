import { relations } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { CURRENT_TIMESTAMP_MS, timestampMs } from "./helpers";

export const JOB_SITES = ["V2EX", "ELE_DUCK", "RUANYF"] as const;
export const JOB_TAG_KINDS = ["display", "search"] as const;

export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    originId: text("origin_id").notNull(),
    originUrl: text("origin_url").notNull(),
    originSite: text("origin_site", { enum: JOB_SITES }).notNull(),
    originTitle: text("origin_title").notNull(),
    originContent: text("origin_content"),
    originCreateAt: timestampMs("origin_create_at"),
    originUsername: text("origin_username"),
    originUserAvatar: text("origin_user_avatar"),
    syncAt: timestampMs("sync_at").default(CURRENT_TIMESTAMP_MS).notNull(),
    invalid: integer("invalid", { mode: "boolean" }).default(false).notNull(),
    workType: text("work_type"),
    location: text("location"),
    role: text("role"),
    salary: text("salary"),
    annualSalary: text("annual_salary"),
    gender: text("gender"),
    education: text("education"),
    title: text("title"),
    generatedContent: text("generated_content"),
    generatedAt: timestampMs("generated_at"),
    showCount: integer("show_count").default(0).notNull(),
    createdAt: timestampMs("created_at").default(CURRENT_TIMESTAMP_MS).notNull(),
    updatedAt: timestampMs("updated_at")
      .default(CURRENT_TIMESTAMP_MS)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("jobs_origin_unique").on(table.originId, table.originSite),
    index("jobs_origin_create_at_idx").on(table.originCreateAt),
    index("jobs_sync_at_idx").on(table.syncAt),
    index("jobs_invalid_idx").on(table.invalid),
    index("jobs_show_count_idx").on(table.showCount),
  ],
);

export const jobTags = sqliteTable(
  "job_tags",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    kind: text("kind", { enum: JOB_TAG_KINDS }).notNull(),
    createdAt: timestampMs("created_at").default(CURRENT_TIMESTAMP_MS).notNull(),
  },
  (table) => [
    uniqueIndex("job_tags_job_value_kind_unique").on(
      table.jobId,
      table.value,
      table.kind,
    ),
    index("job_tags_job_idx").on(table.jobId),
    index("job_tags_value_idx").on(table.value),
  ],
);

export const ingestionRuns = sqliteTable(
  "ingestion_runs",
  {
    id: text("id").primaryKey(),
    source: text("source", { enum: JOB_SITES }).notNull(),
    status: text("status", {
      enum: ["queued", "running", "completed", "failed"],
    })
      .default("queued")
      .notNull(),
    scheduledAt: timestampMs("scheduled_at"),
    startedAt: timestampMs("started_at"),
    finishedAt: timestampMs("finished_at"),
    error: text("error"),
    createdAt: timestampMs("created_at").default(CURRENT_TIMESTAMP_MS).notNull(),
  },
  (table) => [
    index("ingestion_runs_source_created_at_idx").on(
      table.source,
      table.createdAt,
    ),
    index("ingestion_runs_status_idx").on(table.status),
  ],
);

export const jobRelations = relations(jobs, ({ many }) => ({
  tags: many(jobTags),
}));

export const jobTagRelations = relations(jobTags, ({ one }) => ({
  job: one(jobs, {
    fields: [jobTags.jobId],
    references: [jobs.id],
  }),
}));

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type JobTag = typeof jobTags.$inferSelect;
export type IngestionRun = typeof ingestionRuns.$inferSelect;
