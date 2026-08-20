"use client";

import { useAtom } from "jotai";

import { activeAtom } from "@/legacy-job-store/job-view.store";
import { trackEvent } from "@/lib/job-analytics";

interface JobItemWrapperProps extends React.ComponentPropsWithoutRef<"button"> {
	id: string;
}

export const JobItemWrapper = ({
	id,
	children,
	...props
}: JobItemWrapperProps) => {
	const [active, setActive] = useAtom(activeAtom);

	return (
		<button
			type="button"
			{...props}
			onClick={() => {
				if (active !== id) {
					setActive(id);
					trackEvent("job_click", { id });
				}
			}}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					if (active !== id) {
						setActive(id);
						trackEvent("job_click", { id });
					}
				}
			}}
		>
			{children}
		</button>
	);
};
