import { Badge } from "@/components/legacy-job-ui/badge";
import { cn } from "@/lib/job-utils";

export interface JobStructuredFieldsProps {
	workType?: string | null;
	location?: string | null;
	role?: string | null;
	salary?: string | null;
	annualSalary?: string | null;
	gender?: string | null;
	education?: string | null;
	compact?: boolean;
	className?: string;
}

const FIELD_LABELS = [
	["workType", "工作类型"],
	["location", "地点"],
	["role", "岗位"],
	["salary", "薪资"],
	["annualSalary", "年薪"],
	["gender", "性别"],
	["education", "学历"],
] as const;

export function JobStructuredFields({
	compact = false,
	className,
	...fields
}: JobStructuredFieldsProps) {
	const values = FIELD_LABELS.flatMap(([key, label]) => {
		const value = fields[key]?.trim();
		return value ? [{ key, label, value }] : [];
	});

	if (!values.length) return null;

	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-2",
				className,
			)}
			aria-label="职位结构化信息"
		>
			{values.map(({ key, label, value }) => (
				<Badge
					key={key}
					variant="secondary"
					className={cn(
						"max-w-full gap-1 font-normal",
						compact ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
					)}
				>
					<span className="text-muted-foreground">{label}</span>
					<span className="truncate font-medium text-foreground">{value}</span>
				</Badge>
			))}
		</div>
	);
}
