import { site } from "@actnow/common";
import { createFileRoute } from "@tanstack/react-router";
import { createPageMeta } from "@/lib/seo";

const aboutMeta = createPageMeta({
  title: "关于 X-Hiring",
  description:
    "X-Hiring 聚合 V2EX、电鸭社区与谁在招人的互联网招聘信息。",
  url: "/about",
});

export const Route = createFileRoute("/(app)/about")({
  component: AboutComponent,
  head: () => ({
    meta: aboutMeta.meta,
    links: aboutMeta.links,
  }),
});

function AboutComponent() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-bold text-3xl">关于 X-Hiring</h1>

      <div className="mt-8 space-y-6 text-muted-foreground">
        <p>
          X-Hiring 聚合互联网招聘信息，并使用 Cloudflare Workers AI 生成职位摘要。
        </p>

        <p>
          我们持续抓取公开招聘信息，帮助开发者更快发现远程、兼职和全职机会。
        </p>

        <h2 className="font-semibold text-foreground text-xl">信息来源</h2>
        <ul className="list-inside list-disc space-y-2">
          <li>V2EX 招聘信息</li>
          <li>电鸭社区招聘信息</li>
          <li>谁在招人项目与评论</li>
          <li>AI 生成摘要与职位标签</li>
        </ul>

        <h2 className="font-semibold text-foreground text-xl">联系</h2>
        <p>如果你发现信息错误或有改进建议，欢迎通过 GitHub 联系我们。</p>

        <div className="flex gap-4">
          <a
            className="flex items-center gap-2 text-foreground hover:underline"
            href={site.authorUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="i-hugeicons-user" />
            {site.author}
          </a>
          <a
            className="flex items-center gap-2 text-foreground hover:underline"
            href={site.githubUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="i-hugeicons-github" />
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
