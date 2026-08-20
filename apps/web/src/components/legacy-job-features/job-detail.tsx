import type React from "react";
import { memo } from "react";
import Markdown from "react-markdown";
import { formatJobTitle } from "@actnow/common";

import { JobSiteTag } from "@/components/legacy-job-shared/job-site-tag";
import { JobStructuredFields } from "@/components/legacy-job-shared/job-structured-fields";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/legacy-job-ui/avatar";
import { Badge } from "@/components/legacy-job-ui/badge";
import { Separator } from "@/components/legacy-job-ui/separator";
import { cn, formatPosDate } from "@/lib/job-utils";
import type { JobDetailOutput } from "@/lib/orpc-types";

interface JobDetailServerProps extends React.ComponentPropsWithoutRef<"div"> {
  data: JobDetailOutput;
}

export const JobDetail = memo(({ data, ...props }: JobDetailServerProps) => {
	const displayTitle = formatJobTitle(data.workType, data.title);

	return (
    <div
      {...props}
      className={cn("mx-auto w-full max-w-2xl py-8", props.className)}
    >
      <div>
        <div className="mb-4 md:flex md:items-center md:space-x-3">
          <div className="flex items-center space-x-3">
            <JobSiteTag type={data.originSite} />
            <div className="flex items-center space-x-2">
              <Avatar className="h-5 w-5 border border-zinc-100">
                {data.originUserAvatar && (
                  <AvatarImage
                    alt={data.originUsername ? `${data.originUsername}头像` : "职位发布者头像"}
                    src={data.originUserAvatar}
                  />
                )}
                <AvatarFallback>
                  {data.originUsername?.slice(0, 1).toLocaleUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="max-w-[240px]">
                <div className="truncate text-sm">{data.originUsername}</div>
              </div>
            </div>
          </div>
          <div className="mt-3 text-sm text-muted-foreground md:mt-0">
            {data.originCreateAt
              ? `${formatPosDate(data.originCreateAt)} 发布`
              : "未知"}
          </div>
        </div>
		<div className="break-words text-2xl">{displayTitle}</div>
		<JobStructuredFields
			workType={data.workType}
			location={data.location}
			role={data.role}
			salary={data.salary}
			annualSalary={data.annualSalary}
			gender={data.gender}
			education={data.education}
			className="mt-4"
		/>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {data.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="max-w-60 px-4 py-1 font-medium text-foreground md:text-sm"
            >
              <span className="truncate">{tag}</span>
            </Badge>
          ))}
        </div>
      </div>
      <Separator className="my-7" />
      <article className="prose w-full max-w-full dark:prose-invert">
        <Markdown>{data.generatedContent}</Markdown>
      </article>
    </div>
  );
});

JobDetail.displayName = "JobDetail";
