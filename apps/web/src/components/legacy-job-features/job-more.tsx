"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import React, { memo, useEffect, useRef } from "react";

import { Spinners } from "@/components/legacy-job-shared/icons";
import { useIntersectionObserver } from "@/hooks/legacy-job/use-intersection-observer";
import { JobItem } from "./job-item";
import { orpc } from "@/lib/orpc";

interface JobMoreProps {
	searchKeys?: string[];
	dateRange?: (Date | undefined)[];
	type?: "news" | "trending";
	cursor: string;
}

export const JobMore = memo(
	({
		searchKeys = [],
		dateRange = [],
		type = "news",
		cursor,
	}: JobMoreProps) => {
		const bottomTriggerRef = useRef<HTMLDivElement>(null);
		const inView = useIntersectionObserver(bottomTriggerRef);

		const { data, error, fetchNextPage, hasNextPage, isFetching, refetch } =
			useInfiniteQuery(
				orpc.app.job.list.infiniteOptions({
					input: (pageParam) => ({
						searchKeys,
						dateRange,
						type,
						cursor: pageParam,
						limit: 10,
					}),
					initialPageParam: cursor,
					getNextPageParam: (lastPage) => lastPage.nextCursor,
				}),
			);

		useEffect(() => {
			if (inView && !isFetching) {
				void fetchNextPage();
			}
		}, [inView, isFetching, fetchNextPage]);

		if (error) {
			return (
				<div className="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground">
					<span>职位加载失败，请重试。</span>
					<button
						type="button"
						className="rounded-md border border-input px-3 py-1.5 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						onClick={() => void refetch()}
					>
						重试
					</button>
				</div>
			);
		}

		return (
			<>
				{data?.pages.map((group) => (
					<React.Fragment key={group.nextCursor}>
						{group.data.map((job) => (
							<JobItem key={job.id} data={job} searchKeys={searchKeys} />
						))}
					</React.Fragment>
				))}
				{cursor || hasNextPage || isFetching ? (
					<div
						ref={bottomTriggerRef}
						className="col-span-5 lg:col-span-3 2xl:col-span-4"
					>
						<div className="flex h-80 w-full items-center justify-center text-3xl">
							<Spinners />
						</div>
					</div>
				) : (
					<div className="py-6 text-center">没有更多</div>
				)}
			</>
		);
	},
);

JobMore.displayName = "JobMore";
