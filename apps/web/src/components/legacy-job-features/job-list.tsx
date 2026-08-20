import { useId } from "react";
import type { JobFeedItem } from "@/lib/orpc-types";

import { JobItem } from "./job-item";
import { JobMore } from "./job-more";

interface JobListProps {
	searchKeys?: string[];
	dateRange?: (Date | undefined)[];
	type?: "news" | "trending";
	firstSlice: JobFeedItem[];
}

export const JobList = ({
	searchKeys = [],
	dateRange,
	type = "news",
	firstSlice = [],
}: JobListProps) => {
	const id = useId();
	const visibleItems = firstSlice.length > 10 ? firstSlice.slice(0, -1) : firstSlice;
	const nextCursor = firstSlice.length > 10 ? firstSlice.at(-1) : undefined;

	return (
		<div className="w-full">
			{visibleItems.length ? (
				visibleItems.map((job) => (
					<JobItem key={id + job.id} data={job} searchKeys={searchKeys} />
				))
			) : (
				<div className="flex h-full min-h-96 w-full items-center justify-center">
					<div>数据为空</div>
				</div>
			)}

			{nextCursor && (
				<JobMore
					searchKeys={searchKeys}
					dateRange={dateRange}
					type={type}
					cursor={nextCursor.id}
				/>
			)}
		</div>
	);
};
