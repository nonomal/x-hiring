import { createFileRoute, notFound } from "@tanstack/react-router";

import { Logo } from "@/components/legacy-job-shared/logo";
import JobCorrelationList from "@/components/legacy-job-features/job-correlation-list";
import { JobDetail } from "@/components/legacy-job-features/job-detail";
import { Button } from "@/components/legacy-job-ui/button";
import { Separator } from "@/components/legacy-job-ui/separator";
import { client } from "@/lib/orpc";

export const Route = createFileRoute("/(app)/$id")({
  loader: async ({ params }) => {
    try {
      const detail = await client.app.job.detail({ id: params.id });
      const correlations = await client.app.job.correlation({ id: params.id });
      return { detail, correlations };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Job not found")) {
        throw notFound();
      }
      throw error;
    }
  },
  component: DetailPage,
});

function DetailPage() {
  const { detail, correlations } = Route.useLoaderData();

  return (
    <div className="mx-auto w-full max-w-3xl py-8 max-md:px-4">
      <div className="flex items-center justify-between pb-6">
        <a href="/" className="text-2xl font-bold">
          <Logo />
        </a>
        <div className="flex items-center space-x-3">
          {detail.originUrl ? (
            <Button asChild>
              <a href={detail.originUrl} target="_blank" rel="noreferrer">
                立即申请
              </a>
            </Button>
          ) : null}
          <Button variant="outline" asChild>
            <a href="/" aria-label="返回首页">
              <span className="i-lucide-arrow-left-from-line" />
            </a>
          </Button>
        </div>
      </div>
      <Separator />
      <JobDetail data={detail} className="max-w-full" />
      {correlations.length ? (
        <JobCorrelationList list={correlations} />
      ) : (
        <div className="flex min-h-48 w-full items-center justify-center text-muted-foreground">
          暂无相似职位
        </div>
      )}
    </div>
  );
}
