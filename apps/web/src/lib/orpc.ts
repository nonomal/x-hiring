import { xHiringRouter } from "@actnow/api/routers/x-hiring";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { toast } from "sonner";

type RuntimeRouterClient = RouterClient<typeof xHiringRouter>;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(`Error: ${error.message}`, {
        action: {
          label: "retry",
          onClick: () => {
            queryClient.invalidateQueries();
          },
        },
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(error.message || "Operation failed");
    },
  }),
});

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(xHiringRouter, {
      context: async () => {
        const { createContext } = await import("@actnow/api/context");
        const req = getRequest();
        return createContext({ req });
      },
    }),
  )
  .client((): RuntimeRouterClient => {
    const link = new RPCLink({
      url: `${window.location.origin}/api/rpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    });

    return createORPCClient(link);
  });

export const client: RuntimeRouterClient = getORPCClient();

export const orpc = createTanstackQueryUtils(client);
