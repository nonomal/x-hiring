import { readFileSync, writeFileSync } from "node:fs";
import { normalizeLegacyJob, type LegacyJobRecord } from "../src/legacy-import";

function sqlString(value: string | null) {
  return value === null ? "NULL" : `'${value.replaceAll("'", "''")}'`;
}

function sqlNumber(value: number | null) {
  return value === null ? "NULL" : String(Math.trunc(value));
}

function usage(): never {
  throw new Error(
    "Usage: pnpm --filter @actnow/db legacy:import -- --input legacy-jobs.json --output jobs.sql --manifest jobs.manifest.json",
  );
}

const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const outputIndex = args.indexOf("--output");
const manifestIndex = args.indexOf("--manifest");
if (inputIndex < 0 || outputIndex < 0 || manifestIndex < 0) usage();

const inputPath = args[inputIndex + 1];
const outputPath = args[outputIndex + 1];
const manifestPath = args[manifestIndex + 1];
if (!inputPath || !outputPath || !manifestPath) usage();

const parsed = JSON.parse(readFileSync(inputPath, "utf8")) as unknown;
const records = Array.isArray(parsed)
  ? parsed
  : parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { jobs?: unknown }).jobs)
    ? (parsed as { jobs: unknown[] }).jobs
    : null;
if (!records) throw new Error("Input must be a JSON array or an object with a jobs array");

const normalized = records.map((record) =>
  normalizeLegacyJob((record ?? {}) as LegacyJobRecord),
);
const jobIds = new Set<string>();
const originKeys = new Set<string>();
for (const { job } of normalized) {
  if (jobIds.has(job.id)) throw new Error(`Duplicate legacy job id: ${job.id}`);
  jobIds.add(job.id);
  const originKey = `${job.originSite}:${job.originId}`;
  if (originKeys.has(originKey)) {
    throw new Error(`Duplicate legacy origin key: ${originKey}`);
  }
  originKeys.add(originKey);
}
const tagCount = normalized.reduce((count, item) => count + item.tags.length, 0);
const lines = [
  "PRAGMA foreign_keys = ON;",
];

for (const { job, tags } of normalized) {
  lines.push(
    `INSERT OR IGNORE INTO jobs (id, origin_id, origin_url, origin_site, origin_title, origin_content, origin_create_at, origin_username, origin_user_avatar, sync_at, invalid, title, generated_content, generated_at, show_count, created_at, updated_at) VALUES (${sqlString(job.id)}, ${sqlString(job.originId)}, ${sqlString(job.originUrl)}, ${sqlString(job.originSite)}, ${sqlString(job.originTitle)}, ${sqlString(job.originContent)}, ${sqlNumber(job.originCreateAt)}, ${sqlString(job.originUsername)}, ${sqlString(job.originUserAvatar)}, ${sqlNumber(job.syncAt)}, ${job.invalid ? 1 : 0}, ${sqlString(job.title)}, ${sqlString(job.generatedContent)}, ${sqlNumber(job.generatedAt)}, ${job.showCount}, ${sqlNumber(job.createdAt)}, ${sqlNumber(job.updatedAt)});`,
  );
  tags.forEach((tag, index) => {
    const tagId = `${job.id}:${tag.kind}:${index}`;
    lines.push(
      `INSERT OR IGNORE INTO job_tags (id, job_id, value, kind, created_at) VALUES (${sqlString(tagId)}, ${sqlString(job.id)}, ${sqlString(tag.value)}, ${sqlString(tag.kind)}, ${sqlNumber(job.createdAt)});`,
    );
  });
}

lines.push(`-- Imported ${normalized.length} legacy jobs`);
writeFileSync(outputPath, `${lines.join("\n")}\n`);
writeFileSync(
  manifestPath,
  `${JSON.stringify(
    {
      format: 1,
      generatedAt: new Date().toISOString(),
      jobCount: normalized.length,
      tagCount,
      jobIds: [...jobIds],
      originKeys: [...originKeys],
    },
    null,
    2,
  )}\n`,
);
console.log(
  `Wrote ${normalized.length} jobs, ${tagCount} tags to ${outputPath}; manifest ${manifestPath}`,
);
