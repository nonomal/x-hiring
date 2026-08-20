import type { JobCorrelationItem } from "@/lib/orpc-types";

import JobCorrelationList from "./job-correlation-list";

export default async function JobCorrelationServerList({
  list,
}: {
  list: JobCorrelationItem[];
}) {
  if (list.length === 0) {
    return null;
  }

  return <JobCorrelationList list={list} />;
}
