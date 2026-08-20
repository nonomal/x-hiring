"use client";

import { viewLineAtom } from "@/legacy-job-store/job-view.store";
import { useAtom } from "jotai";
import { useEffect } from "react";
import type { JobFeedItem } from "@/lib/orpc-types";

export default function ViewLineWrapper({
	children,
	searchKeys = [],
	dateRange = [],
	firstSlice,
}: {
	children: React.ReactNode;
	searchKeys?: string[];
	dateRange?: (Date | undefined)[];
	firstSlice: JobFeedItem[];
}) {
	const [viewLine, setViewLine] = useAtom(viewLineAtom);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (!searchKeys?.length && !dateRange?.length && firstSlice?.length) {
			const firstJob = firstSlice[0];
			setViewLine({
				before: viewLine.tmp ?? viewLine.before,
				tmp: viewLine.now,
				now: firstJob?.id,
			});
		}
	}, []);

	return <>{children}</>;
}
