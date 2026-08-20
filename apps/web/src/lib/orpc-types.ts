import type { InferClientOutputs } from "@orpc/client";
import type { client } from "./orpc";

export type ClientOutputs = InferClientOutputs<typeof client>;

export type JobFeedOutput = ClientOutputs["app"]["job"]["list"];
export type JobFeedItem = JobFeedOutput["data"][number];
export type JobDetailOutput = ClientOutputs["app"]["job"]["detail"];
export type JobCorrelationOutput = ClientOutputs["app"]["job"]["correlation"];
export type JobCorrelationItem = JobCorrelationOutput[number];
