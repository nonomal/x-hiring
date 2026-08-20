import { getAuth } from "@actnow/auth";
import { getOptionalBinding } from "@actnow/common/runtime-env.server";
import { createDb } from "@actnow/db";

export type ApiCache = {
  get(key: string, type: "text"): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
};

export async function createContext({ req }: { req: Request }) {
  // Public job/RSS/health requests do not need to hit Better Auth. Keep auth
  // available for protected procedures, but avoid a session lookup when the
  // request clearly has no credentials.
  const hasCredentials =
    req.headers.has("cookie") || req.headers.has("authorization");
  const session = hasCredentials
    ? await getAuth().api.getSession({ headers: req.headers })
    : null;

  return {
    session,
    db: createDb(),
    cache: getOptionalBinding<ApiCache>("CACHE"),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
