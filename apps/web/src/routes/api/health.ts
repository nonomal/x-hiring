import { createContext } from "@actnow/api/context";
import { count, eq } from "@actnow/db";
import { jobs } from "@actnow/db/schema/jobs";
import { createFileRoute } from "@tanstack/react-router";

async function handle({ request }: { request: Request }) {
  try {
    const { db } = await createContext({ req: request });
    const [result] = await db
      .select({ jobs: count() })
      .from(jobs)
      .where(eq(jobs.invalid, false));

    return Response.json({
      ok: true,
      service: "x-hiring",
      healthyJobs: result?.jobs ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return Response.json(
      {
        ok: false,
        service: "x-hiring",
        error: "Service temporarily unavailable",
      },
      { status: 503 },
    );
  }
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: handle,
    },
  },
});
