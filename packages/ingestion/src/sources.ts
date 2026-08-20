import { load } from "cheerio";

export const sourceHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
};

const V2EX_LIST_URL = "https://www.v2ex.com/go/jobs?p=";
const V2EX_DETAIL_URL = "https://www.v2ex.com/t/";
const ELE_DUCK_LIST_URL = "https://eleduck.com/?category=5&sort=new&page=";
const ELE_DUCK_DETAIL_URL = "https://eleduck.com/posts/";
const SOURCE_REQUEST_TIMEOUT_MS = 20_000;

export type JobSource = "V2EX" | "ELE_DUCK" | "RUANYF";

export type SourceArticle = {
  source: JobSource;
  originId: string;
  originUrl: string;
  originTitle: string;
  originContent?: string;
  originCreateAt?: Date;
  originUsername?: string;
  originUserAvatar?: string;
  category?: string;
};

async function fetchSource(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    SOURCE_REQUEST_TIMEOUT_MS,
  );
  try {
    return await fetch(url, {
      ...init,
      headers: { ...sourceHeaders, ...init?.headers },
      signal: init?.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url: string, init?: RequestInit) {
  const response = await fetchSource(url, init);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  const text = await response.text();
  if (!text) throw new Error(`${url} returned an empty response`);
  return text;
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date;
}

export async function fetchV2exPage(page: number): Promise<SourceArticle[]> {
  const html = await fetchText(`${V2EX_LIST_URL}${page}`);
  const doc = load(html);
  const baseUrl = new URL(V2EX_LIST_URL);
  const articles: SourceArticle[] = [];

  doc("#TopicsNode .cell").each((_index, element) => {
    const item = doc(element);
    const href = item.find("span.item_title a").attr("href") ?? "";
    const url = new URL(href, baseUrl.origin);
    const originId = url.pathname.split("/").pop();
    const title = item.find("span.item_title a").text().trim();
    const username = item.find("span.topic_info strong a").text().trim();
    const avatar = item.find("img.avatar").attr("src");
    if (!originId || !title || !username || !avatar) return;

    articles.push({
      source: "V2EX",
      originId,
      originUrl: url.href,
      originTitle: title,
      originUsername: username,
      originUserAvatar: avatar,
    });
  });

  return articles;
}

export async function fetchV2exDetail(id: string) {
  const html = await fetchText(`${V2EX_DETAIL_URL}${id}`);
  const doc = load(html);
  const content = doc("#Main .topic_content")
    .map((_index, element) => doc(element).text().trim())
    .get()
    .join("\n");
  const createdAt = doc("#Main small.gray span").attr("title");
  if (!content || !createdAt) throw new Error(`V2EX detail ${id} is incomplete`);
  return { content, createdAt: parseDate(createdAt) };
}

function getNextData(html: string): Record<string, unknown> {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match?.[1]) throw new Error("Eleduck page data is missing");
  return JSON.parse(match[1]) as Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export async function fetchEleDuckPage(page: number): Promise<SourceArticle[]> {
  const data = getNextData(await fetchText(`${ELE_DUCK_LIST_URL}${page}`));
  const props = asRecord(data.props);
  const initialProps = asRecord(props.initialProps);
  const pageProps = asRecord(initialProps.pageProps);
  const postList = asRecord(pageProps.postList);
  if (!Array.isArray(postList.posts)) {
    throw new Error("Eleduck post list is unavailable");
  }
  const posts = postList.posts;

  return posts.flatMap((value) => {
    const post = asRecord(value);
    const user = asRecord(post.user);
    const category = asRecord(post.category);
    const id = String(post.id ?? "");
    const title = String(post.title ?? "");
    const categoryCode = typeof category.code === "string" ? category.code : "";
    if (!id || !title || !["jd", "talent", "upwork"].includes(categoryCode)) {
      return [];
    }
    return [
      {
        source: "ELE_DUCK" as const,
        originId: id,
        originUrl: `${ELE_DUCK_DETAIL_URL}${id}`,
        originTitle: title,
        originContent:
          typeof post.summary === "string" ? post.summary.trim() : undefined,
        originCreateAt: parseDate(post.published_at),
        originUsername: typeof user.nickname === "string" ? user.nickname : undefined,
        originUserAvatar:
          typeof user.avatar_url === "string" ? user.avatar_url : undefined,
        category: categoryCode,
      },
    ];
  });
}

export async function fetchEleDuckDetail(id: string) {
  const data = getNextData(await fetchText(`${ELE_DUCK_DETAIL_URL}${id}`));
  const props = asRecord(data.props);
  const initialProps = asRecord(props.initialProps);
  const pageProps = asRecord(initialProps.pageProps);
  const article = asRecord(pageProps.post);
  const main = typeof article.raw_content === "string"
    ? load(article.raw_content).text()
    : "";
  const tags = Array.isArray(article.tags)
    ? article.tags.map((value) => {
        const tag = asRecord(value);
        const group = asRecord(tag.tag_group);
        return `${String(group.name ?? "")}: ${String(tag.name ?? "")}`;
      })
    : [];
  const content = `${main}\n${tags.join("\n")}`.trim();
  if (!content) throw new Error(`Eleduck detail ${id} is empty`);
  return { content };
}

type GitHubComment = {
  id: number;
  html_url: string;
  created_at: string;
  body: string;
  user?: { login?: string; avatar_url?: string };
};

export async function fetchRuanyfComments(token?: string): Promise<SourceArticle[]> {
  const headers = {
    ...sourceHeaders,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const issuesResponse = await fetchSource(
    "https://api.github.com/repos/ruanyf/weekly/issues?state=open&creator=ruanyf&per_page=100",
    { headers },
  );
  if (!issuesResponse.ok) throw new Error(`GitHub issues returned ${issuesResponse.status}`);
  const issues = (await issuesResponse.json()) as Array<Record<string, unknown>>;
  const issue = issues.find((value) => String(value.title ?? "").startsWith("谁在招人"));
  if (!issue) throw new Error("Ruanyf hiring issue is missing");

  const number = Number(issue.number);
  const commentsResponse = await fetchSource(
    `https://api.github.com/repos/ruanyf/weekly/issues/${number}/comments?per_page=100`,
    { headers },
  );
  if (!commentsResponse.ok) {
    throw new Error(`GitHub comments returned ${commentsResponse.status}`);
  }
  const comments = (await commentsResponse.json()) as GitHubComment[];
  const title = String(issue.title ?? "谁在招人");

  return comments.map((comment) => ({
    source: "RUANYF",
    originId: `${number}_${comment.id}`,
    originUrl: comment.html_url,
    originTitle: title,
    originContent: comment.body,
    originCreateAt: parseDate(comment.created_at),
    originUsername: comment.user?.login,
    originUserAvatar: comment.user?.avatar_url,
  }));
}
