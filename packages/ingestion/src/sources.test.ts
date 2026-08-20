import { describe, expect, it } from "vite-plus/test";
import { fetchEleDuckPage } from "./sources";

function htmlForPage(posts: unknown[]) {
  return `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: {
      initialProps: {
        pageProps: {
          postList: { posts },
        },
      },
    },
  })}</script>`;
}

describe("Eleduck source adapter", () => {
  it("filters the current homepage feed to job categories and keeps summaries", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        htmlForPage([
          {
            id: "talk-1",
            title: "社区讨论",
            summary: "不是招聘信息",
            category: { code: "talk" },
          },
          {
            id: "job-1",
            title: "远程前端工程师",
            summary: "负责远程前端开发",
            published_at: "2026-08-20T00:00:00.000Z",
            category: { code: "jd" },
            user: { nickname: "招聘方", avatar_url: "https://example.com/avatar.png" },
          },
        ]),
        { status: 200, headers: { "content-type": "text/html" } },
      );

    try {
      const result = await fetchEleDuckPage(1);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        originId: "job-1",
        originContent: "负责远程前端开发",
        category: "jd",
        originUsername: "招聘方",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fails loudly when Eleduck serves a verification page without a post list", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        htmlForPage([]).replace('"postList":{"posts":[]}', '"verification":true'),
        { status: 200 },
      );

    try {
      await expect(fetchEleDuckPage(1)).rejects.toThrow(
        "Eleduck post list is unavailable",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("uses an abortable signal for source requests", async () => {
    const originalFetch = globalThis.fetch;
    let signal: AbortSignal | undefined;
    globalThis.fetch = async (_url, init) => {
      signal = init?.signal ?? undefined;
      return new Response(htmlForPage([]), { status: 200 });
    };

    try {
      await fetchEleDuckPage(1);
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal?.aborted).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
