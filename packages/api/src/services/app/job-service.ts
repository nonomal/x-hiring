import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "@actnow/db";
import { jobTags, jobs } from "@actnow/db/schema/jobs";
import { ORPCError } from "@orpc/server";
import type { AppContext } from "../../lib/context-types";
import { combineFilters } from "../../lib/utils";

type JobFeedInput = {
  searchKeys: string[];
  dateRange: (Date | undefined)[];
  type: "news" | "trending";
  limit: number;
  cursor?: string;
};

type JobListItem = Pick<
  typeof jobs.$inferSelect,
  | "id"
  | "originSite"
  | "originCreateAt"
  | "originUsername"
  | "originUserAvatar"
  | "workType"
  | "location"
  | "role"
  | "salary"
  | "annualSalary"
  | "gender"
  | "education"
  | "title"
> & { tags: string[] };

async function getTagsByJobIds(context: AppContext, jobIds: string[]) {
  const tagMap = new Map<string, string[]>();
  if (!jobIds.length) return tagMap;

  const rows = await context.db
    .select({ jobId: jobTags.jobId, value: jobTags.value })
    .from(jobTags)
    .where(
      and(inArray(jobTags.jobId, jobIds), eq(jobTags.kind, "display")),
    );

  for (const row of rows) {
    const values = tagMap.get(row.jobId) ?? [];
    values.push(row.value);
    tagMap.set(row.jobId, values);
  }
  return tagMap;
}

async function getSearchTagsByJobId(context: AppContext, jobId: string) {
  const rows = await context.db
    .select({ value: jobTags.value })
    .from(jobTags)
    .where(and(eq(jobTags.jobId, jobId), eq(jobTags.kind, "search")));
  return rows.map((row) => row.value);
}

export async function listJobsService(
  context: AppContext,
  input: JobFeedInput,
): Promise<{ data: JobListItem[]; nextCursor?: string }> {
  const { db } = context;
  const conditions: SQL[] = [eq(jobs.invalid, false)];

  for (const searchKey of input.searchKeys) {
    conditions.push(
      or(
        ilike(jobs.title, `%${searchKey}%`),
        ilike(jobs.workType, `%${searchKey}%`),
        ilike(jobs.location, `%${searchKey}%`),
        ilike(jobs.role, `%${searchKey}%`),
        ilike(jobs.salary, `%${searchKey}%`),
        ilike(jobs.annualSalary, `%${searchKey}%`),
        ilike(jobs.gender, `%${searchKey}%`),
        ilike(jobs.education, `%${searchKey}%`),
      )!,
    );
  }

  const [start, end] = input.dateRange;
  if (start) conditions.push(gte(jobs.syncAt, start));
  if (end) conditions.push(lte(jobs.syncAt, end));

  const cursorRows = input.cursor
    ? await db
        .select({
          id: jobs.id,
          originCreateAt: jobs.originCreateAt,
          showCount: jobs.showCount,
        })
        .from(jobs)
        .where(eq(jobs.id, input.cursor))
        .limit(1)
    : [];
  const cursorRow = cursorRows[0];

  if (cursorRow) {
    if (input.type === "news") {
      conditions.push(
        cursorRow.originCreateAt
          ? or(
              isNull(jobs.originCreateAt),
              lt(jobs.originCreateAt, cursorRow.originCreateAt),
              and(
                eq(jobs.originCreateAt, cursorRow.originCreateAt),
                lt(jobs.id, cursorRow.id),
              ),
            )!
          : and(isNull(jobs.originCreateAt), lt(jobs.id, cursorRow.id))!,
      );
    } else if (input.type === "trending") {
      conditions.push(
        or(
          lt(jobs.showCount, cursorRow.showCount),
          and(
            eq(jobs.showCount, cursorRow.showCount),
            lt(jobs.id, cursorRow.id),
          ),
        )!,
      );
    }
  }

  const orderBy =
    input.type === "trending"
      ? [desc(jobs.showCount), desc(jobs.id)]
      : [desc(jobs.originCreateAt), desc(jobs.id)];

  const rows = await db
    .select({
      id: jobs.id,
      originSite: jobs.originSite,
      originCreateAt: jobs.originCreateAt,
      originUsername: jobs.originUsername,
      originUserAvatar: jobs.originUserAvatar,
      workType: jobs.workType,
      location: jobs.location,
      role: jobs.role,
      salary: jobs.salary,
      annualSalary: jobs.annualSalary,
      gender: jobs.gender,
      education: jobs.education,
      title: jobs.title,
    })
    .from(jobs)
    .where(combineFilters(conditions))
    .orderBy(...orderBy)
    .limit(input.limit + 1);

  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  const tags = await getTagsByJobIds(
    context,
    items.map((item) => item.id),
  );

  return {
    data: items.map((item) => ({ ...item, tags: tags.get(item.id) ?? [] })),
    nextCursor: hasMore ? items.at(-1)?.id : undefined,
  };
}

export async function getJobDetailService(
  context: AppContext,
  input: { id: string },
  options: { trackView?: boolean } = {},
) {
  const rows = await context.db
    .select({
      id: jobs.id,
      originId: jobs.originId,
      originUrl: jobs.originUrl,
      originSite: jobs.originSite,
      originCreateAt: jobs.originCreateAt,
      originUsername: jobs.originUsername,
      originUserAvatar: jobs.originUserAvatar,
      workType: jobs.workType,
      location: jobs.location,
      role: jobs.role,
      salary: jobs.salary,
      annualSalary: jobs.annualSalary,
      gender: jobs.gender,
      education: jobs.education,
      title: jobs.title,
      generatedContent: jobs.generatedContent,
    })
    .from(jobs)
    .where(and(eq(jobs.id, input.id), eq(jobs.invalid, false)))
    .limit(1);
  const job = rows[0];

  if (!job) {
    throw new ORPCError("NOT_FOUND", { message: "Job not found" });
  }

  if (options.trackView !== false) {
    await context.db
      .update(jobs)
      .set({ showCount: sql`${jobs.showCount} + 1`, updatedAt: new Date() })
      .where(eq(jobs.id, input.id));
  }

  const [displayTags, searchTags] = await Promise.all([
    getTagsByJobIds(context, [input.id]),
    getSearchTagsByJobId(context, input.id),
  ]);

  return {
    ...job,
    tags: displayTags.get(input.id) ?? [],
    fullTags: searchTags,
  };
}

export async function getJobCorrelationService(
  context: AppContext,
  input: { id: string },
) {
  const job = await getJobDetailService(context, input, { trackView: false });
  if (!job.fullTags.length) return [];

  const tagRows = await context.db
    .select({ jobId: jobTags.jobId, value: jobTags.value })
    .from(jobTags)
    .where(
      and(
        inArray(jobTags.value, job.fullTags),
        eq(jobTags.kind, "search"),
        ne(jobTags.jobId, job.id),
      ),
    );

  const scoreMap = new Map<string, number>();
  for (const row of tagRows) {
    scoreMap.set(row.jobId, (scoreMap.get(row.jobId) ?? 0) + 1);
  }

  const candidateIds = [...scoreMap.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12)
    .map(([id]) => id);
  if (!candidateIds.length) return [];

  const candidates = await context.db
    .select({
      id: jobs.id,
      originId: jobs.originId,
      originUrl: jobs.originUrl,
      originSite: jobs.originSite,
      originCreateAt: jobs.originCreateAt,
      originUsername: jobs.originUsername,
      originUserAvatar: jobs.originUserAvatar,
      workType: jobs.workType,
      location: jobs.location,
      role: jobs.role,
      salary: jobs.salary,
      annualSalary: jobs.annualSalary,
      gender: jobs.gender,
      education: jobs.education,
      title: jobs.title,
    })
    .from(jobs)
    .where(and(inArray(jobs.id, candidateIds), eq(jobs.invalid, false)));
  const tags = await getTagsByJobIds(
    context,
    candidates.map((candidate) => candidate.id),
  );

  return candidates
    .sort(
      (left, right) =>
        (scoreMap.get(right.id) ?? 0) - (scoreMap.get(left.id) ?? 0),
    )
    .slice(0, 6)
    .map((candidate) => ({ ...candidate, tags: tags.get(candidate.id) ?? [] }));
}

export async function listRssJobsService(context: AppContext, limit = 20) {
  const cacheKey = `jobs:rss:${limit}`;
  const cached = await context.cache?.get(cacheKey, "text");
  if (cached) {
    const rows = JSON.parse(cached) as Array<{
      id: string;
      originUrl: string | null;
      originSite: string;
      originCreateAt: string | null;
      originUsername: string | null;
      workType: string | null;
      location: string | null;
      role: string | null;
      salary: string | null;
      annualSalary: string | null;
      gender: string | null;
      education: string | null;
      title: string | null;
      generatedContent: string | null;
      tags: string[];
    }>;
    return rows.map((row) => ({
      ...row,
      originCreateAt: row.originCreateAt ? new Date(row.originCreateAt) : null,
    }));
  }

  const rows = await context.db
    .select({
      id: jobs.id,
      originUrl: jobs.originUrl,
      originSite: jobs.originSite,
      originCreateAt: jobs.originCreateAt,
      originUsername: jobs.originUsername,
      workType: jobs.workType,
      location: jobs.location,
      role: jobs.role,
      salary: jobs.salary,
      annualSalary: jobs.annualSalary,
      gender: jobs.gender,
      education: jobs.education,
      title: jobs.title,
      generatedContent: jobs.generatedContent,
    })
    .from(jobs)
    .where(eq(jobs.invalid, false))
    .orderBy(desc(jobs.originCreateAt), desc(jobs.id))
    .limit(limit);

  const tagMap = await getTagsByJobIds(
    context,
    rows.map((row) => row.id),
  );

  const result = rows.map((row) => ({
    ...row,
    tags: tagMap.get(row.id) ?? [],
  }));
  await context.cache?.put(cacheKey, JSON.stringify(result), {
    expirationTtl: 60,
  });
  return result;
}
