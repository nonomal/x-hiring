import type { ApiCache, Context } from "../context";

export type ApiDb = Context["db"];

export type ApiSession = NonNullable<Context["session"]>;

export type AppContext = Pick<Context, "db" | "session"> & {
  cache?: ApiCache;
};

export type ProtectedAppContext = {
  db: ApiDb;
  session: ApiSession;
};

export type PanelContext = Pick<Context, "db">;
