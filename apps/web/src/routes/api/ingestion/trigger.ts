import {
  scheduleIngestion,
  type IngestionEnvironment,
} from "@actnow/ingestion";
import {
  getBinding,
  getOptionalBinding,
  getOptionalEnv,
} from "@actnow/common/runtime-env.server";
import { createFileRoute } from "@tanstack/react-router";

const HIGH_FREQUENCY_CRON = "0 0,2,5,7,10,15 * * *";
const LOW_FREQUENCY_CRON = "0 4 * * *";

function isAllowedCron(value: string): value is typeof HIGH_FREQUENCY_CRON | typeof LOW_FREQUENCY_CRON {
  return value === HIGH_FREQUENCY_CRON || value === LOW_FREQUENCY_CRON;
}

function getIngestionEnvironment(): IngestionEnvironment {
  return {
    DB: getBinding<Env["DB"]>("DB"),
    CACHE: getOptionalBinding<IngestionEnvironment["CACHE"]>("CACHE"),
    AI: getBinding<IngestionEnvironment["AI"]>("AI"),
    JOBS_QUEUE: getBinding<IngestionEnvironment["JOBS_QUEUE"]>("JOBS_QUEUE"),
  };
}

async function handle({ request }: { request: Request }) {
  const secret = getOptionalEnv("INGESTION_TRIGGER_SECRET");
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cron = new URL(request.url).searchParams.get("cron") ?? LOW_FREQUENCY_CRON;
  if (!isAllowedCron(cron)) {
    return Response.json(
      { error: "Unsupported cron", allowed: [HIGH_FREQUENCY_CRON, LOW_FREQUENCY_CRON] },
      { status: 400 },
    );
  }

  const tasks = await scheduleIngestion(
    getIngestionEnvironment(),
    cron,
    Date.now(),
  );
  if (!tasks.length) {
    return Response.json(
      { ok: false, error: "Ingestion is already scheduled" },
      { status: 429, headers: { "retry-after": "60" } },
    );
  }
  return Response.json({ ok: true, cron, tasks });
}

export const Route = createFileRoute("/api/ingestion/trigger")({
  server: {
    handlers: {
      POST: handle,
    },
  },
});
