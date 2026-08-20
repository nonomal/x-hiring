import { createContext } from "@actnow/api/context";
import { listRssJobsService } from "@actnow/api/services/app/job-service";
import { formatJobTitle } from "@actnow/common";
import { createFileRoute } from "@tanstack/react-router";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cdata(value: string) {
  return `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

async function handle({ request }: { request: Request }) {
  const requestUrl = new URL(request.url);
  const siteUrl = `${requestUrl.protocol}//${requestUrl.host}`;
  const jobs = await listRssJobsService(
    await createContext({ req: request }),
  );
  const items = jobs
    .map(
      (job) => `
    <item>
      <title>${escapeXml(formatJobTitle(job.workType, job.title))}</title>
      <guid isPermaLink="false">${escapeXml(job.id)}</guid>
      <link>${escapeXml(`${siteUrl}/${job.id}`)}</link>
      <description>${cdata(job.generatedContent ?? "")}</description>
      <pubDate>${(job.originCreateAt ?? new Date()).toUTCString()}</pubDate>
      <author>${escapeXml(`${job.originSite} - ${job.originUsername ?? "未知"}`)}</author>
      ${job.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join("")}
    </item>`,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>X-Hiring</title>
    <description>互联网招聘信息聚合</description>
    <link>${escapeXml(siteUrl)}</link>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=60, stale-while-revalidate=30",
    },
  });
}

export const Route = createFileRoute("/feed.xml")({
  server: {
    handlers: {
      GET: handle,
    },
  },
});
