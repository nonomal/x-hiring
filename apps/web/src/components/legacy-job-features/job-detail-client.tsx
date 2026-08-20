"use client";

import { useQuery } from "@tanstack/react-query";
import { memo, useEffect, useRef } from "react";

import { Spinners } from "@/components/legacy-job-shared/icons";
import { Button } from "@/components/legacy-job-ui/button";
import { Separator } from "@/components/legacy-job-ui/separator";
import { orpc } from "@/lib/orpc";

import JobCorrelationList from "./job-correlation-list";
import { JobDetail } from "./job-detail";

interface JobDetailClientProps {
  id: string;
  onClose: () => void;
}

export const JobDetailClient = memo(({ id, onClose }: JobDetailClientProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

	const { data, error, isFetching, refetch } = useQuery(
    orpc.app.job.detail.queryOptions({ input: { id } }),
  );

	const correlationQuery = useQuery(
    orpc.app.job.correlation.queryOptions({ input: { id } }),
  );

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, []);

  return (
    <>
      <div className="flex items-center justify-between p-3">
        <Button variant={"outline"} asChild>
          <a href={`/${id}`} className="space-x-2">
            <span className="i-lucide-maximize-2"/>
            <span>展开</span>
          </a>
        </Button>
        <div className="flex items-center space-x-3">
          {!isFetching && data?.originUrl ? (
            <Button asChild>
              <a href={data.originUrl} target="_blank" rel="noreferrer">
                立即申请
              </a>
            </Button>
          ) : null}
          <Button variant={"outline"} onClick={() => onClose()}>
            <span className="i-lucide-arrow-left-from-line"/>
            <span className="sr-only">关闭职位详情</span>
          </Button>
        </div>
      </div>
      <Separator />
      <div ref={contentRef} className="w-full overflow-y-auto">
        {isFetching ? (
          <div className="flex min-h-[calc(100vh-100px)] w-full flex-grow items-center justify-center text-3xl">
            <Spinners />
          </div>
		) : error ? (
			<div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
				<span>详情获取失败，请重试。</span>
				<Button variant="outline" onClick={() => void refetch()}>
					重试
				</Button>
			</div>
		) : data ? (
          <div className="w-full flex-grow">
            <JobDetail data={data} className="max-md:px-4" />
          </div>
        ) : (
          <div className="flex min-h-[300px] w-full items-center justify-center">
            详情获取异常
          </div>
        )}
        {correlationQuery.isFetching ? (
          <div className="flex min-h-96 w-full flex-grow items-center justify-center text-3xl">
            <Spinners />
          </div>
		) : correlationQuery.error ? (
			<div className="flex min-h-[180px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
				<span>相似职位获取失败。</span>
				<Button variant="outline" onClick={() => void correlationQuery.refetch()}>
					重试
				</Button>
			</div>
		) : correlationQuery.data ? (
          <JobCorrelationList
            list={correlationQuery.data}
            isClient={true}
            className="mx-auto max-w-2xl max-md:px-4"
          />
        ) : (
          <div className="flex min-h-[300px] w-full items-center justify-center">
            类似职位获取异常
          </div>
        )}
      </div>
    </>
  );
});

JobDetailClient.displayName = "JobDetailClient";
