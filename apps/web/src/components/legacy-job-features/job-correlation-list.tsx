import type React from "react";
import { formatJobTitle } from "@actnow/common";

import { JobSiteTag } from "@/components/legacy-job-shared/job-site-tag";
import { JobStructuredFields } from "@/components/legacy-job-shared/job-structured-fields";
import { Badge } from "@/components/legacy-job-ui/badge";
import { Card, CardContent, CardHeader } from "@/components/legacy-job-ui/card";
import { Separator } from "@/components/legacy-job-ui/separator";
import { cn, formatPosDate } from "@/lib/job-utils";
import type { JobCorrelationItem } from "@/lib/orpc-types";

import { JobItemWrapper } from "./job-item-wrapper";

interface JobCorrelationList extends React.ComponentPropsWithoutRef<"div"> {
	list: JobCorrelationItem[];
	isClient?: boolean;
}

function JobCorrelationList({
	list,
	isClient = false,
	...props
}: JobCorrelationList) {
	return (
		<div {...props} className={cn("w-full py-8", props.className)}>
			<Separator />
			<h3 className="mb-7 mt-5 text-xl">相似职位</h3>
			<div className="space-y-4">
				{list.map((job) => (
					<JobCorrelationCard key={job.id} job={job} isClient={isClient} />
				))}
			</div>
		</div>
	);
}

export default JobCorrelationList;

interface JobCorrelationCardProps extends React.ComponentPropsWithoutRef<"div"> {
	job: JobCorrelationItem;
	isClient?: boolean;
}

function JobCorrelationCard({
	job,
	isClient = false,
}: JobCorrelationCardProps) {
	const renderCard = (
		<Card className="cursor-pointer">
			<CardHeader className="p-4">
				<div className="md:flex md:items-center md:space-x-3">
					<div className="flex items-center space-x-3">
						<JobSiteTag type={job.originSite} />
						<div className="flex items-center space-x-2">
							{job.originUserAvatar && (
								<img
									src={job.originUserAvatar}
									className="h-5 w-5 rounded-full border border-zinc-100"
									alt={job.originUsername || ""}
								/>
							)}
							<div className="max-w-[240px]">
								<div className="truncate text-sm">{job.originUsername}</div>
							</div>
						</div>
					</div>
					<div className="mt-3 text-sm text-muted-foreground md:mt-0">
						{job.originCreateAt
							? `${formatPosDate(job.originCreateAt)} 发布`
							: "未知"}
					</div>
				</div>
			</CardHeader>
			<CardContent className="p-4 pt-0">
				<div className="text-md">{formatJobTitle(job.workType, job.title)}</div>
				<JobStructuredFields
					workType={job.workType}
					location={job.location}
					role={job.role}
					salary={job.salary}
					annualSalary={job.annualSalary}
					gender={job.gender}
					education={job.education}
					compact
					className="mt-2"
				/>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					{job.tags.map((tag) => (
						<Badge
							key={tag}
							variant="outline"
							className="max-w-60 px-3 py-1 text-xs font-medium text-foreground"
						>
							<span className="truncate">{tag}</span>
						</Badge>
					))}
				</div>
			</CardContent>
		</Card>
	);

	if (isClient) {
		return <JobItemWrapper id={job.id}>{renderCard}</JobItemWrapper>;
	}

	return (
		<a href={`/${job.id}`} className="block">
			{renderCard}
		</a>
	);
}
