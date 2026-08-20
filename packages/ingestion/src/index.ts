import {
  analyzeJob,
  type WorkersAiBinding,
} from "@actnow/ai";
import { getOptionalEnv } from "@actnow/common/runtime-env.server";
import { and, desc, eq, inArray } from "@actnow/db";
import { createDb, type D1Client } from "@actnow/db";
import { ingestionRuns, jobTags, jobs } from "@actnow/db/schema/jobs";
import {
  fetchEleDuckDetail,
  fetchEleDuckPage,
  fetchRuanyfComments,
  fetchV2exDetail,
  fetchV2exPage,
  type JobSource,
  type SourceArticle,
} from "./sources";

export type IngestionEnvironment = {
  DB: D1Client;
  CACHE?: {
    get(key: string, type: "text"): Promise<string | null>;
    put(
      key: string,
      value: string,
      options?: { expirationTtl?: number },
    ): Promise<void>;
    delete(key: string): Promise<void>;
  };
  AI: WorkersAiBinding;
  JOBS_QUEUE: {
    sendBatch(
      messages: Array<{
        body: IngestionTask;
        contentType: "json";
      }>,
    ): Promise<void>;
  };
};

export type IngestionTask = {
  kind: "ingest-source";
  runId: string;
  source: JobSource;
};

export type QueueMessage = {
  body: unknown;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
};

export type QueueBatch = { messages: readonly QueueMessage[] };

const HIGH_FREQUENCY_CRONS = new Set([
  "0 0,2,5,7,10,15 * * *",
  "0 0 * * *",
  "0 2 * * *",
  "0 5 * * *",
  "0 7 * * *",
  "0 10 * * *",
  "0 15 * * *",
]);
const LOW_FREQUENCY_CRON = "0 4 * * *";
const MAX_NEW_ARTICLES_PER_TASK = 5;
const MAX_AI_INPUT_LENGTH = 12_000;
const MAX_TAGS = 12;
const MAX_TAG_LENGTH = 48;
const INGESTION_LOCK_TTL_SECONDS = 300;

function getSourcesForCron(cron: string): JobSource[] {
  if (cron === LOW_FREQUENCY_CRON) return ["RUANYF"];
  if (HIGH_FREQUENCY_CRONS.has(cron)) return ["V2EX", "ELE_DUCK"];
  // A manual/local scheduled invocation should exercise every source.
  return ["V2EX", "ELE_DUCK", "RUANYF"];
}

function isSource(value: unknown): value is JobSource {
  return value === "V2EX" || value === "ELE_DUCK" || value === "RUANYF";
}

function parseTask(value: unknown): IngestionTask | null {
  if (!value || typeof value !== "object") return null;
  const task = value as Record<string, unknown>;
  if (
    task.kind !== "ingest-source" ||
    typeof task.runId !== "string" ||
    !isSource(task.source)
  ) {
    return null;
  }
  return {
    kind: "ingest-source",
    runId: task.runId,
    source: task.source,
  };
}

function isAvailableContent(text: string) {
  return Boolean(text) && !text.includes("求职");
}

function isAvailableCategory(category?: string) {
  return category === "jd" || category === "talent" || category === "upwork";
}

function deriveSearchTags(title: string, tags: string[]) {
  const words = title.match(/[\p{Script=Han}]{2,}|[A-Za-z0-9+#.-]{2,}/gu) ?? [];
  return [...new Set([...words, ...tags])]
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 1);
}

async function getExistingIds(db: ReturnType<typeof createDb>, source: JobSource) {
  const rows = await db
    .select({ originId: jobs.originId })
    .from(jobs)
    .where(eq(jobs.originSite, source))
    .orderBy(desc(jobs.originCreateAt))
    .limit(300);
  return new Set(rows.map((row) => row.originId));
}

async function saveArticle(
  db: ReturnType<typeof createDb>,
  env: IngestionEnvironment,
  article: SourceArticle,
) {
  const existing = await db
    .select({ id: jobs.id, invalid: jobs.invalid, title: jobs.title })
    .from(jobs)
    .where(
      and(eq(jobs.originId, article.originId), eq(jobs.originSite, article.source)),
    )
    .limit(1);
  const existingJob = existing[0];
  if (existingJob) {
    // Repair records created by older ingestion versions that could insert a
    // job before its tags. New writes below are transactional.
    if (!existingJob.invalid) {
      const existingTags = await db
        .select({ value: jobTags.value })
        .from(jobTags)
        .where(eq(jobTags.jobId, existingJob.id))
        .limit(1);
      if (!existingTags.length) {
        const fallbackTags = deriveSearchTags(existingJob.title ?? "", []).slice(
          0,
          MAX_TAGS,
        );
        if (fallbackTags.length) {
          await db
            .insert(jobTags)
            .values(
              fallbackTags.flatMap((value) => [
                {
                  id: crypto.randomUUID(),
                  jobId: existingJob.id,
                  value,
                  kind: "display" as const,
                },
                {
                  id: crypto.randomUUID(),
                  jobId: existingJob.id,
                  value,
                  kind: "search" as const,
                },
              ]),
            )
            .onConflictDoNothing();
        }
      }
    }
    return;
  }

  const base = {
    id: crypto.randomUUID(),
    originId: article.originId,
    originUrl: article.originUrl,
    originSite: article.source,
    originTitle: article.originTitle,
    originContent: article.originContent,
    originCreateAt: article.originCreateAt,
    originUsername: article.originUsername,
    originUserAvatar: article.originUserAvatar,
  } as const;

  let content = article.originContent;
  let analysis = null as Awaited<ReturnType<typeof analyzeJob>> | null;

  if (article.source === "V2EX") {
    if (!isAvailableContent(article.originTitle)) {
      await db.insert(jobs).values({ ...base, invalid: true });
      return;
    }
    const detail = await fetchV2exDetail(article.originId);
    content = detail.content;
    article.originCreateAt = detail.createdAt;
  } else if (article.source === "ELE_DUCK") {
    if (!isAvailableCategory(article.category)) {
      await db.insert(jobs).values({ ...base, invalid: true });
      return;
    }
    try {
      const detail = await fetchEleDuckDetail(article.originId);
      content = detail.content;
    } catch (error) {
      if (!content) throw error;
      console.warn("Eleduck detail unavailable; using list summary", {
        originId: article.originId,
        error,
      });
    }
  }

  if (!content) {
    await db.insert(jobs).values({ ...base, invalid: true });
    return;
  }

  try {
    analysis = await analyzeJob(
      env.AI,
      `${article.originTitle}\n${content.slice(0, MAX_AI_INPUT_LENGTH)}`,
      getOptionalEnv("AI_JOB_MODEL") ?? "",
      {
        gateway: {
          id: getOptionalEnv("AI_GATEWAY_ID") ?? "default",
          cacheTtl: 86400,
          collectLog: true,
          metadata: {
            service: "x-hiring-ingestion",
            source: article.source,
          },
        },
      },
    );
  } catch (error) {
    console.error("Workers AI analysis failed; queue retry will handle it", {
      source: article.source,
      originId: article.originId,
      error,
    });
    throw error;
  }

  const valid =
    analysis.valid &&
    Boolean(analysis.workType?.trim()) &&
    Boolean(analysis.title?.trim()) &&
    Boolean(analysis.content?.trim());
  const jobId = base.id;
  await db.transaction(async (tx) => {
    await tx.insert(jobs).values({
      ...base,
      originCreateAt: article.originCreateAt,
      originContent: content,
      invalid: !valid,
      workType: valid ? analysis.workType : undefined,
      location: valid ? analysis.location : undefined,
      role: valid ? analysis.role : undefined,
      salary: valid ? analysis.salary : undefined,
      annualSalary: valid ? analysis.annualSalary : undefined,
      gender: valid ? analysis.gender : undefined,
      education: valid ? analysis.education : undefined,
      title: valid ? analysis.title : undefined,
      generatedContent: valid ? analysis.content : undefined,
      generatedAt: valid ? new Date() : undefined,
    });

    if (valid) {
      const displayTags = (analysis.tags ?? [])
        .map((tag) => tag.trim().slice(0, MAX_TAG_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_TAGS);
      const safeDisplayTags = displayTags.length ? displayTags : [article.source];
      const structuredSearchValues = [
        analysis.workType,
        analysis.location,
        analysis.role,
        analysis.salary,
        analysis.annualSalary,
        analysis.gender,
        analysis.education,
      ];
      const searchTags = [
        ...structuredSearchValues,
        ...displayTags,
      ]
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => value.trim().slice(0, MAX_TAG_LENGTH))
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index)
        .slice(0, MAX_TAGS);
      const safeSearchTags = searchTags.length ? searchTags : safeDisplayTags;
      const tagValues = [
        ...safeDisplayTags.map((value) => ({ value, kind: "display" as const })),
        ...safeSearchTags.map((value) => ({ value, kind: "search" as const })),
      ];
      for (let index = 0; index < tagValues.length; index += 20) {
        const batch = tagValues.slice(index, index + 20);
        await tx
          .insert(jobTags)
          .values(
            batch.map(({ value, kind }) => ({
              id: crypto.randomUUID(),
              jobId,
              value,
              kind,
            })),
          )
          .onConflictDoNothing();
      }
    }
  });
}

async function runV2ex(db: ReturnType<typeof createDb>, env: IngestionEnvironment) {
  const existing = await getExistingIds(db, "V2EX");
  let stopped = 0;
  let processed = 0;
  for (let page = 1; page <= 60 && stopped <= 5; page += 1) {
    const articles = await fetchV2exPage(page);
    if (!articles.length) break;
    for (const article of articles) {
      if (existing.has(article.originId)) stopped += 1;
      else {
        stopped = 0;
        await saveArticle(db, env, article);
        processed += 1;
        if (processed >= MAX_NEW_ARTICLES_PER_TASK) break;
      }
    }
    if (processed >= MAX_NEW_ARTICLES_PER_TASK) break;
  }
}

async function runEleDuck(db: ReturnType<typeof createDb>, env: IngestionEnvironment) {
  const existing = await getExistingIds(db, "ELE_DUCK");
  let stopped = 0;
  let processed = 0;
  for (let page = 1; page <= 60 && stopped <= 5; page += 1) {
    const articles = await fetchEleDuckPage(page);
    if (!articles.length) break;
    for (const article of articles) {
      if (existing.has(article.originId)) stopped += 1;
      else {
        stopped = 0;
        await saveArticle(db, env, article);
        processed += 1;
        if (processed >= MAX_NEW_ARTICLES_PER_TASK) break;
      }
    }
    if (processed >= MAX_NEW_ARTICLES_PER_TASK) break;
  }
}

async function runRuanyf(db: ReturnType<typeof createDb>, env: IngestionEnvironment) {
  const existing = await getExistingIds(db, "RUANYF");
  const articles = await fetchRuanyfComments(getOptionalEnv("GITHUB_TOKEN"));
  let processed = 0;
  for (const article of articles) {
    if (!existing.has(article.originId)) {
      await saveArticle(db, env, article);
      processed += 1;
      if (processed >= MAX_NEW_ARTICLES_PER_TASK) break;
    }
  }
}

export async function runIngestionTask(
  env: IngestionEnvironment,
  task: IngestionTask,
) {
  const db = createDb(env.DB);
  await db
    .update(ingestionRuns)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(ingestionRuns.id, task.runId));

  try {
    if (task.source === "V2EX") await runV2ex(db, env);
    if (task.source === "ELE_DUCK") await runEleDuck(db, env);
    if (task.source === "RUANYF") await runRuanyf(db, env);
    await db
      .update(ingestionRuns)
      .set({ status: "completed", finishedAt: new Date() })
      .where(eq(ingestionRuns.id, task.runId));
    await env.CACHE?.delete("jobs:rss:20");
  } catch (error) {
    await db
      .update(ingestionRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      })
      .where(eq(ingestionRuns.id, task.runId));
    throw error;
  }
}

export async function scheduleIngestion(
  env: IngestionEnvironment,
  cron: string,
  scheduledTime: number,
) {
  const lockKey = `ingestion:active:${cron}`;
  if (env.CACHE) {
    const active = await env.CACHE.get(lockKey, "text");
    if (active) return [];
    await env.CACHE.put(lockKey, String(scheduledTime), {
      expirationTtl: INGESTION_LOCK_TTL_SECONDS,
    });
  }

  const db = createDb(env.DB);
  const sources = getSourcesForCron(cron);
  const tasks = sources.map((source) => ({
    kind: "ingest-source" as const,
    source,
    runId: crypto.randomUUID(),
  }));

  await db.insert(ingestionRuns).values(
    tasks.map((task) => ({
      id: task.runId,
      source: task.source,
      status: "queued" as const,
      scheduledAt: new Date(scheduledTime),
    })),
  );
  try {
    await env.JOBS_QUEUE.sendBatch(
      tasks.map((body) => ({ body, contentType: "json" as const })),
    );
  } catch (error) {
    await db
      .update(ingestionRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      })
      .where(inArray(ingestionRuns.id, tasks.map((task) => task.runId)));
    throw error;
  }
  return tasks;
}

export async function processIngestionQueue(
  env: IngestionEnvironment,
  batch: QueueBatch,
) {
  for (const message of batch.messages) {
    const task = parseTask(message.body);
    if (!task) {
      console.error("Ignoring invalid ingestion queue message", message.body);
      message.ack();
      continue;
    }

    try {
      await runIngestionTask(env, task);
      message.ack();
    } catch (error) {
      console.error("Ingestion task failed", { task, error });
      message.retry({ delaySeconds: 60 });
    }
  }
}
