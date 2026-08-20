import {
  jobCorrelationSchema,
  jobDetailSchema,
  jobFeedSchema,
} from "@actnow/common";
import { publicProcedure } from "../../index";
import {
  getJobCorrelationService,
  getJobDetailService,
  listJobsService,
} from "../../services/app/job-service";

export const jobRouter = {
  list: publicProcedure
    .input(jobFeedSchema)
    .handler(async ({ context, input }) => listJobsService(context, input)),

  detail: publicProcedure
    .input(jobDetailSchema)
    .handler(async ({ context, input }) =>
      getJobDetailService(context, input),
    ),

  correlation: publicProcedure
    .input(jobCorrelationSchema)
    .handler(async ({ context, input }) =>
      getJobCorrelationService(context, input),
    ),
};
