import { memo } from "react";
import Highlighter from "react-highlight-words";
import { formatJobTitle } from "@actnow/common";

import { JobSiteTag } from "@/components/legacy-job-shared/job-site-tag";
import { JobStructuredFields } from "@/components/legacy-job-shared/job-structured-fields";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/legacy-job-ui/avatar";
import { Badge } from "@/components/legacy-job-ui/badge";
import { formatPosDate } from "@/lib/job-utils";
import type { JobFeedItem } from "@/lib/orpc-types";

import { JobItemWrapper } from "./job-item-wrapper";
import ViewLine from "./view-line";

interface JobItemProps {
	searchKeys?: string[];
	data: JobFeedItem;
}

export const JobItem = memo(({ searchKeys, data }: JobItemProps) => {
	const publishDate = data.originCreateAt
		? `${formatPosDate(data.originCreateAt)} 发布`
		: "未知";
	const displayTitle = formatJobTitle(data.workType, data.title);

	return (
		<JobItemWrapper
			id={data.id}
			aria-label={`查看职位：${displayTitle}`}
			className="relative flex w-full cursor-pointer border-b border-border bg-background p-5 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset max-md:flex-col max-md:space-y-4 md:p-8"
		>
			<ViewLine id={data.id} />
			<div className="flex flex-shrink-0 space-x-3 md:w-[280px]">
				<Avatar className="h-12 w-12 border border-zinc-100 md:h-14 md:w-14">
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
				<div className="space-y-1 max-md:flex-grow md:max-w-36 md:space-y-3">
					<div className="flex items-center justify-between">
						<JobSiteTag type={data.originSite} />
						<div className="text-sm text-muted-foreground md:hidden">{publishDate}</div>
					</div>
					<div className="text-md truncate">{data.originUsername}</div>
				</div>
			</div>
			<div className="min-w-0 flex-1">
				<div className="mb-3 text-sm text-muted-foreground max-md:hidden">
					{publishDate}
				</div>
				<div className="break-words text-xl md:text-2xl">
					{searchKeys?.length ? (
						<Highlighter
							searchWords={searchKeys}
							autoEscape={true}
							textToHighlight={displayTitle}
						/>
					) : (
						displayTitle
					)}
				</div>
				<JobStructuredFields
					workType={data.workType}
					location={data.location}
					role={data.role}
					salary={data.salary}
					annualSalary={data.annualSalary}
					gender={data.gender}
					education={data.education}
					compact
					className="mt-3"
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
		</JobItemWrapper>
	);
});

JobItem.displayName = "JobItem";
