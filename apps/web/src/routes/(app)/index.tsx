import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Header } from "@/components/legacy-job-features/header";
import { JobFilter } from "@/components/legacy-job-features/job-filter";
import { JobList } from "@/components/legacy-job-features/job-list";
import { JobViewDrawer } from "@/components/legacy-job-features/job-view-drawer";
import ViewLineWrapper from "@/components/legacy-job-features/view-line-wrapper";
import { client } from "@/lib/orpc";

const searchSchema = z.object({
  search: z.string().optional().default(""),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  type: z
    .enum(["news", "trending", "all", "model", "platform", "style"])
    .default("news"),
  sort: z.string().optional(),
  tag: z.string().optional(),
  checkout_id: z.string().optional(),
  createdById: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  email: z.string().optional(),
});

export const Route = createFileRoute("/(app)/")({
  component: HomeComponent,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({
    ...search,
    searchKeys: search.search.split(",").filter(Boolean),
  }),
  loader: async ({ deps }) =>
    client.app.job.list({
      searchKeys: deps.searchKeys,
      dateRange: [deps.startDate, deps.endDate],
      type: deps.type === "trending" ? "trending" : "news",
      limit: 11,
    }),
  head: () => ({
    meta: [
      { title: "X-Hiring - 互联网招聘信息" },
      {
        name: "description",
        content: "聚合 V2EX、电鸭社区与谁在招人的互联网招聘信息。",
      },
    ],
  }),
});

function HomeComponent() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const firstSlice = Route.useLoaderData();
  const searchKeys = search.search.split(",").filter(Boolean);
  const dateRange = [search.startDate, search.endDate] as (Date | undefined)[];
  const jobType = search.type === "trending" ? "trending" : "news";

  const updateFilter = (value: {
    search?: string[];
    startDate?: Date;
    endDate?: Date;
    type?: "news" | "trending";
  }) => {
    void navigate({
      to: "/",
      search: (previous) => ({
        ...previous,
        search: value.search?.length ? value.search.join(",") : undefined,
        startDate: value.startDate?.toISOString(),
        endDate: value.endDate?.toISOString(),
        type: value.type,
      }),
    });
  };

  return (
    <ViewLineWrapper
      firstSlice={firstSlice.data}
      searchKeys={searchKeys}
      dateRange={dateRange}
    >
      <div className="mx-auto min-h-screen min-w-0 max-w-6xl border-x border-zinc-100">
        <Header />
        <main className="mt-12">
          <div className="px-4 md:px-8">
            <JobFilter
              search={searchKeys}
              startDate={search.startDate}
              endDate={search.endDate}
              type={jobType}
              onChange={updateFilter}
            />
          </div>
          <div className="mt-12 border-t border-zinc-100">
            <JobList
              searchKeys={searchKeys}
              dateRange={dateRange}
              type={jobType}
              firstSlice={firstSlice.data}
            />
          </div>
          <JobViewDrawer />
        </main>
      </div>
    </ViewLineWrapper>
  );
}
