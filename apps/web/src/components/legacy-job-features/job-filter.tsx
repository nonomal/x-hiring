"use client";

import { addDays, addYears } from "date-fns";
import { memo, useCallback, useMemo } from "react";

import { ComboOptionInput } from "@/components/legacy-job-shared/combo-option-input";
import { DatePickerWithRange } from "@/components/legacy-job-shared/date-picker-with-range";
import { cn, convertToValidDateRange } from "@/lib/job-utils";
import type { DateRange } from "react-day-picker";

const sortMap = [
	{
		key: "news",
		label: "最新",
	},
	{
		key: "trending",
		label: "热门",
	},
] as const;

interface JobFilterProps {
	search: string[];
	startDate?: Date;
	endDate?: Date;
	type: "news" | "trending";
	onChange: (value: {
		search?: string[];
		startDate?: Date;
		endDate?: Date;
		type?: "news" | "trending";
	}) => void;
}

export const JobFilter = memo(
	({ search, startDate, endDate, type, onChange }: JobFilterProps) => {

	const dateRangeValue = useMemo(() => {
		const [from, to] = convertToValidDateRange([startDate, endDate]) || [];
		return { from, to };
	}, [startDate, endDate]);

	const handleSearch = useCallback(
		(val: string[]) => onChange({ search: val }),
		[onChange],
	);

	const handleDateChange = useCallback(
		(dateValue: DateRange | undefined) => {
			const range = convertToValidDateRange([dateValue?.from, dateValue?.to]);
			onChange({ startDate: range[0], endDate: range[1] });
		},
		[onChange],
	);

	const handleTypeChange = useCallback(
		(nextType: "news" | "trending") => onChange({ type: nextType }),
		[onChange],
	);

	return (
		<div className="w-full items-center max-md:space-y-3 md:flex md:space-x-2">
			<div className="relative flex-grow">
				<ComboOptionInput initValue={search} onChange={handleSearch} />
			</div>
			<DatePickerWithRange
				placeholder="日期范围"
				defaultDate={dateRangeValue}
				onChange={handleDateChange}
				disabled={[
					{ from: addDays(new Date(), 1), to: addYears(new Date(), 100) },
				]}
			/>
			<div className="flex h-10 w-full items-center gap-1 rounded-xl border border-input p-1 md:min-w-[220px] md:w-auto">
				{sortMap.map((sortType) => (
					<button
						type="button"
						key={sortType.key}
						className={cn(
							"flex h-8 w-1/2 cursor-pointer items-center justify-center rounded-sm bg-transparent capitalize hover:bg-muted max-md:text-sm",
							type === sortType.key ? "bg-muted font-medium" : "",
						)}
						onClick={() => handleTypeChange(sortType.key)}
					>
						{sortType.label}
					</button>
				))}
			</div>
		</div>
	);
  },
);

JobFilter.displayName = "JobFilter";
