import { readFileSync, writeFileSync } from "node:fs";

function sqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function usage(): never {
  throw new Error(
    "Usage: pnpm --filter @actnow/db legacy:rollback -- --manifest jobs.manifest.json --output rollback.sql",
  );
}

const args = process.argv.slice(2);
const manifestIndex = args.indexOf("--manifest");
const outputIndex = args.indexOf("--output");
if (manifestIndex < 0 || outputIndex < 0) usage();

const manifestPath = args[manifestIndex + 1];
const outputPath = args[outputIndex + 1];
if (!manifestPath || !outputPath) usage();

const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  format?: unknown;
  jobIds?: unknown;
};
if (manifest.format !== 1 || !Array.isArray(manifest.jobIds)) {
  throw new Error("Invalid legacy import manifest");
}
const jobIds = manifest.jobIds.filter(
  (value): value is string => typeof value === "string" && Boolean(value),
);
if (jobIds.length !== manifest.jobIds.length) {
  throw new Error("Legacy import manifest contains invalid job IDs");
}

const lines = ["PRAGMA foreign_keys = ON;"];
for (let index = 0; index < jobIds.length; index += 50) {
  const batch = jobIds.slice(index, index + 50);
  lines.push(`DELETE FROM jobs WHERE id IN (${batch.map(sqlString).join(", ")});`);
}
lines.push(`-- Rolled back ${jobIds.length} imported jobs`);
writeFileSync(outputPath, `${lines.join("\n")}\n`);
console.log(`Wrote rollback SQL for ${jobIds.length} jobs to ${outputPath}`);
