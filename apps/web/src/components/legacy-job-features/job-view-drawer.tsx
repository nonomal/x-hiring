"use client";

import { useAtom } from "jotai";
import { useEffect } from "react";

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/legacy-job-ui/sheet";

import { activeAtom } from "@/legacy-job-store/job-view.store";
import { JobDetailClient } from "./job-detail-client";

export function JobViewDrawer() {
	const [activeId, setActive] = useAtom(activeAtom);

	useEffect(() => {
		const handlePopState = () => {
			const match = window.location.pathname.match(/^\/([^/]+)$/);
			setActive(match?.[1] ?? null);
		};

		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [setActive]);

	useEffect(() => {
		const query = window.location.search;
		const nextPath = activeId ? `/${activeId}${query}` : `/${query}`;
		const currentPath = `${window.location.pathname}${query}`;
		if (currentPath !== nextPath) {
			window.history.pushState({}, "", nextPath);
		}
	}, [activeId]);

	return (
		<Sheet
			open={!!activeId}
			onOpenChange={(val) => {
				if (!val) {
					setActive(null);
				}
			}}
		>
			<SheetHeader className="hidden">
				<SheetTitle>职位详情</SheetTitle>
				<SheetDescription>职位描述</SheetDescription>
			</SheetHeader>
			<SheetContent
				side="left"
				className="min-w-full focus-visible:outline-0 md:min-w-[1000px]"
			>
				{activeId && (
					<JobDetailClient
						id={activeId}
						onClose={() => {
							setActive(null);
						}}
					/>
				)}
			</SheetContent>
		</Sheet>
	);
}
