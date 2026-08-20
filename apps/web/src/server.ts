import {
  processIngestionQueue,
  scheduleIngestion,
  type IngestionEnvironment,
} from "@actnow/ingestion";
import { runWithRuntimeEnv } from "@actnow/common/runtime-env.server";
import handler from "@tanstack/react-start/server-entry";

type WorkerBindings = Env;

function asRuntimeEnv(env: WorkerBindings) {
  return env as unknown as Record<string, unknown>;
}

function asIngestionEnvironment(env: WorkerBindings): IngestionEnvironment {
  return env as unknown as IngestionEnvironment;
}

export default {
  fetch(request: Request, env: WorkerBindings) {
    return runWithRuntimeEnv(asRuntimeEnv(env), () => handler.fetch(request));
  },

  scheduled(
    event: ScheduledController,
    env: WorkerBindings,
    context: ExecutionContext,
  ) {
    context.waitUntil(
      runWithRuntimeEnv(asRuntimeEnv(env), () =>
        scheduleIngestion(
          asIngestionEnvironment(env),
          event.cron,
          event.scheduledTime,
        ),
      ),
    );
  },

  async queue(
    batch: MessageBatch<unknown>,
    env: WorkerBindings,
  ): Promise<void> {
    await runWithRuntimeEnv(asRuntimeEnv(env), () =>
      processIngestionQueue(asIngestionEnvironment(env), batch),
    );
  },
};
