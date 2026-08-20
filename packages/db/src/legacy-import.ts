import { JOB_SITES, JOB_TAG_KINDS } from "./schema/jobs";

export type LegacyJobRecord = {
  id?: unknown;
  originId?: unknown;
  originUrl?: unknown;
  originSite?: unknown;
  originTitle?: unknown;
  originContent?: unknown;
  originCreateAt?: unknown;
  originUsername?: unknown;
  originUserAvatar?: unknown;
  syncAt?: unknown;
  invalid?: unknown;
  title?: unknown;
  tags?: unknown;
  fullTags?: unknown;
  generatedContent?: unknown;
  generatedAt?: unknown;
  showCount?: unknown;
};

export type NormalizedLegacyJob = {
  job: {
    id: string;
    originId: string;
    originUrl: string;
    originSite: (typeof JOB_SITES)[number];
    originTitle: string;
    originContent: string | null;
    originCreateAt: number | null;
    originUsername: string | null;
    originUserAvatar: string | null;
    syncAt: number;
    invalid: boolean;
    title: string | null;
    generatedContent: string | null;
    generatedAt: number | null;
    showCount: number;
    createdAt: number;
    updatedAt: number;
  };
  tags: Array<{
    value: string;
    kind: (typeof JOB_TAG_KINDS)[number];
  }>;
};

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown) {
  const result = stringValue(value).trim();
  return result || null;
}

function dateValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function sourceValue(value: unknown): (typeof JOB_SITES)[number] {
  if (JOB_SITES.includes(value as (typeof JOB_SITES)[number])) {
    return value as (typeof JOB_SITES)[number];
  }
  throw new Error(`Unsupported legacy job originSite: ${String(value)}`);
}

export function normalizeLegacyJob(record: LegacyJobRecord): NormalizedLegacyJob {
  const originId = stringValue(record.originId).trim();
  const originSite = sourceValue(record.originSite);
  if (!originId) throw new Error("Legacy job is missing originId");

  const syncAt = dateValue(record.syncAt) ?? Date.now();
  const displayTags = [...new Set(stringArray(record.tags))];
  const searchTags = [...new Set(stringArray(record.fullTags))];

  return {
    job: {
      id: stringValue(record.id).trim() || `legacy-${originSite}-${originId}`,
      originId,
      originUrl: stringValue(record.originUrl).trim(),
      originSite,
      originTitle: stringValue(record.originTitle).trim(),
      originContent: nullableString(record.originContent),
      originCreateAt: dateValue(record.originCreateAt),
      originUsername: nullableString(record.originUsername),
      originUserAvatar: nullableString(record.originUserAvatar),
      syncAt,
      invalid: record.invalid === true,
      title: nullableString(record.title),
      generatedContent: nullableString(record.generatedContent),
      generatedAt: dateValue(record.generatedAt),
      showCount:
        typeof record.showCount === "number" && Number.isFinite(record.showCount)
          ? Math.max(0, Math.trunc(record.showCount))
          : 0,
      createdAt: syncAt,
      updatedAt: syncAt,
    },
    tags: [
      ...displayTags.map((value) => ({ value, kind: "display" as const })),
      ...searchTags.map((value) => ({ value, kind: "search" as const })),
    ],
  };
}
