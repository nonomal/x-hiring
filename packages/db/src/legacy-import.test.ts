import { describe, expect, it } from "vite-plus/test";
import { normalizeLegacyJob } from "./legacy-import";

describe("normalizeLegacyJob", () => {
  it("maps Prisma array columns to normalized D1 tag rows", () => {
    const result = normalizeLegacyJob({
      id: "job-1",
      originId: "123",
      originUrl: "https://example.com/jobs/123",
      originSite: "V2EX",
      originTitle: "招聘前端工程师",
      originCreateAt: "2026-08-20T00:00:00.000Z",
      tags: ["前端", "前端"],
      fullTags: ["React", "TypeScript"],
      showCount: 4,
    });

    expect(result.job.invalid).toBe(false);
    expect(result.job.originCreateAt).toBe(Date.parse("2026-08-20T00:00:00.000Z"));
    expect(result.tags).toEqual([
      { value: "前端", kind: "display" },
      { value: "React", kind: "search" },
      { value: "TypeScript", kind: "search" },
    ]);
  });

  it("rejects unknown source values before generating SQL", () => {
    expect(() =>
      normalizeLegacyJob({ originId: "1", originSite: "UNKNOWN" }),
    ).toThrow("Unsupported legacy job originSite");
  });
});
