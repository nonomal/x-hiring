# X-Hiring Cloudflare migration

This workspace is the Cloudflare/TanStack Start target for the former X-Hiring application. The recruitment UI remains in the `apps/web/src/components/legacy-job-*` compatibility boundary; the data, API, ingestion, AI, and deployment layers are now Worker-native.

## Runtime topology

- `apps/web`: TanStack Start + Vite + Cloudflare Worker entrypoint.
- D1: `x-hiring` production and `x-hiring-dev` development.
- KV: `CACHE`, with separate production and development namespaces; RSS data is cached for 60 seconds and invalidated after a successful ingestion task.
- Queues: source ingestion tasks are sent to `x-hiring-jobs` / `x-hiring-jobs-dev`, with matching DLQs.
- Cron: high-frequency V2EX/ELE_DUCK runs at `00:00, 02:00, 05:00, 07:00, 10:00, 15:00 UTC`; RUANYF runs at `04:00 UTC`.
- Workers AI: `@cf/openai/gpt-oss-120b` is the configurable production default through `AI_JOB_MODEL`; calls use `workers-ai-provider` and the Vercel AI SDK `generateObject` schema path, then go through the `default` AI Gateway with a 24-hour cache TTL and logging enabled. Structured output is validated by the Zod schema, with one explicit cache-bypassing retry for transient or malformed model responses. Each source task caps new articles to keep Queue executions bounded before writing D1. All source HTTP requests use a 20-second abort timeout so a hung origin becomes a Queue-retryable task failure.

## D1 initialization and data policy

The old Prisma `Job` model maps as follows for schema compatibility and emergency tooling:

| PostgreSQL/Prisma | D1/Drizzle |
| --- | --- |
| `Job` | `jobs` |
| `tags String[]` | `job_tags(kind = 'display')` |
| `fullTags String[]` | `job_tags(kind = 'search')` |
| `originSite` enum | `jobs.origin_site` text enum |

This release does not migrate historical PostgreSQL data. The production D1 database is initialized from the current Drizzle migrations and populated by the first live V2EX, ELE_DUCK, and RUANYF ingestion runs. The exporter/importer below remains isolated as an emergency or future one-off tool; it is not a release prerequisite and is not part of the Worker runtime.

If a future one-off import is explicitly approved, export the old database as JSON with the exporter in the original X-Hiring workspace, then convert it into idempotent D1 SQL in this target workspace:

```bash
cd /absolute/path/to/x-hiring
DATABASE_URL='postgresql://…' pnpm \
  --filter @actijob/db export:jobs -- \
  --output /absolute/path/legacy-jobs.json
```

```bash
cd /absolute/path/to/x-hiring/.repos/actnow-react
pnpm --filter @actnow/db legacy:import -- \
  --input /absolute/path/legacy-jobs.json \
  --output /absolute/path/x-hiring-jobs.sql \
  --manifest /absolute/path/x-hiring-jobs.manifest.json
```

Apply the generated file only after reviewing its row count and a sample:

```bash
cd /absolute/path/to/x-hiring/.repos/actnow-react/apps/web
pnpm exec wrangler d1 execute x-hiring \
  --remote --file /absolute/path/x-hiring-jobs.sql
```

The importer is deliberately separate from the application runtime. It preserves IDs, dates, invalid flags, generated summaries, view counts, and both tag arrays, and uses `INSERT OR IGNORE` for safe reruns. It emits individual D1-compatible statements rather than an explicit transaction, because remote D1 SQL ingest manages the import transaction itself.

The importer fails before writing SQL when duplicate job IDs or duplicate `(originSite, originId)` keys are detected. Keep the manifest with the import log; if a rollback is needed, generate exact deletion SQL from that manifest:

```bash
cd /absolute/path/to/x-hiring/.repos/actnow-react
pnpm --filter @actnow/db legacy:rollback -- \
  --manifest /absolute/path/x-hiring-jobs.manifest.json \
  --output /absolute/path/x-hiring-jobs.rollback.sql
```

Review the generated IDs, then execute the rollback file against the same D1 database. Deletes cascade to normalized tags and do not affect jobs created by later ingestion runs.

## Release/cutover order

1. Run `pnpm db:migrate:local` and `pnpm db:migrate:remote` checks; D1 is the new authoritative database. Before this release, apply the pending `0002_yellow_post.sql`, `0003_typical_jackpot.sql`, and `0004_groovy_pet_avengers.sql` migrations to both remote D1 databases.
2. Set `BETTER_AUTH_SECRET`, `INGESTION_TRIGGER_SECRET`, and optionally `GITHUB_TOKEN` for GitHub API rate limits.
3. Build and deploy the development Worker, then smoke-test `/`, `/feed.xml`, `/api/health`, `/api/rpc`, and a real detail URL.
4. Trigger the first high/low ingestion tasks through the protected endpoint and verify Queue, Workers AI, D1 writes, and `ingestion_runs`.
5. Build and deploy the production Worker, then repeat the smoke tests against its official `workers.dev` URL.
6. Attach `x-hiring.hehehai.cn` only after DNS propagation is complete; custom-domain binding is an optional follow-up, not a blocker for the Worker cutover.

## Current external resources

The D1/KV/Queue resources are created. The previously deployed versions remain at `https://x-hiring-web-dev.riverhohai.workers.dev` and `https://x-hiring-web.riverhohai.workers.dev`; this local fix batch has not been deployed yet. The Worker compatibility date is `2026-08-18` because the local Miniflare runtime currently supports dates through that version. Before the next deployment, apply the pending `0002_yellow_post.sql`, `0003_typical_jackpot.sql`, and `0004_groovy_pet_avengers.sql` migrations to both remote D1 databases. The new build has passed local build, type, test, and Cloudflare dry-run checks; the custom domain is intentionally not attached while DNS propagation is being verified.

Do not commit `.env`, `.dev.vars`, Cloudflare secret values, PostgreSQL URLs, or generated data exports.
