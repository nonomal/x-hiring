import { publicProcedure } from "../index";
import { jobRouter } from "./app/job";

/**
 * Runtime surface for the X-Hiring Worker. Template-only routers remain
 * available for source compatibility, but are intentionally not bundled into
 * the public recruitment API.
 */
export const xHiringRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  app: {
    job: jobRouter,
  },
};

export type XHiringRouter = typeof xHiringRouter;
