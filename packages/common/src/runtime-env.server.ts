type RuntimeEnv = Record<string, unknown>;

type RuntimeEnvStorage = {
  run<T>(runtimeEnv: RuntimeEnv, fn: () => T): T;
  getStore(): RuntimeEnv | undefined;
};

let fallbackRuntimeEnv: RuntimeEnv | undefined;

const fallbackStorage: RuntimeEnvStorage = {
  run<T>(runtimeEnv: RuntimeEnv, fn: () => T) {
    const previous = fallbackRuntimeEnv;
    fallbackRuntimeEnv = runtimeEnv;
    try {
      return fn();
    } finally {
      fallbackRuntimeEnv = previous;
    }
  },
  getStore() {
    return fallbackRuntimeEnv;
  },
};

const runtimeEnvStoragePromise: Promise<RuntimeEnvStorage> =
  !("window" in globalThis)
    ? import("node:async_hooks").then(
        ({ AsyncLocalStorage: AsyncLocalStorageConstructor }) =>
          new AsyncLocalStorageConstructor<RuntimeEnv>(),
      )
    : Promise.resolve(fallbackStorage);

let runtimeEnvStorage: RuntimeEnvStorage | undefined;
void runtimeEnvStoragePromise.then((storage) => {
  runtimeEnvStorage = storage;
});

function getProcessEnv(): RuntimeEnv {
  if (typeof process === "undefined") return {};
  return process.env;
}

export async function runWithRuntimeEnv<T>(
  runtimeEnv: RuntimeEnv,
  fn: () => T,
): Promise<T> {
  const storage = await runtimeEnvStoragePromise;
  return storage.run(runtimeEnv, fn);
}

export function getRuntimeEnv(): RuntimeEnv {
  return runtimeEnvStorage?.getStore() ?? getProcessEnv();
}

export function getOptionalEnv(key: string): string | undefined {
  const value = getRuntimeEnv()[key];
  return typeof value === "string" ? value : undefined;
}

export function getEnvValue(key: string): string {
  return getOptionalEnv(key) ?? "";
}

export function getRequiredEnv(key: string): string {
  const value = getOptionalEnv(key);
  if (!value) throw new Error(`${key} is not set`);
  return value;
}

export function getBinding<T>(key: string): T {
  const value = getRuntimeEnv()[key];
  if (value == null) throw new Error(`${key} binding is not set`);
  return value as T;
}

export function getOptionalBinding<T>(key: string): T | undefined {
  const value = getRuntimeEnv()[key];
  return value == null ? undefined : (value as T);
}

export function isDevelopment() {
  return getEnvValue("NODE_ENV") === "development";
}
