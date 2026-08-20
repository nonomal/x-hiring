# X-Hiring

X-Hiring 聚合 V2EX、电鸭社区与谁在招人的互联网招聘信息，并使用 Cloudflare Workers AI 生成职位摘要。

[![GitHub stars](https://img.shields.io/github/stars/hehehai/x-hiring)](https://github.com/hehehai/x-hiring/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/hehehai/x-hiring)](https://github.com/hehehai/x-hiring/network/members)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fx-hiring.hehehai.cn)](https://x-hiring.hehehai.cn)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Features

- **多源聚合** - 抓取 V2EX、电鸭社区与谁在招人的公开招聘信息
- **AI 摘要** - 使用 Workers AI 提取职位标题、摘要及可选的地点、岗位、薪资、年薪、性别和学历字段
- **招聘筛选** - 支持关键词、日期、结构化职位字段和趋势筛选
- **相关职位** - 根据规范化标签推荐相似职位
- **RSS** - 提供 `/feed.xml` 订阅，并使用 Cloudflare KV 缓存
- **Cloudflare Runtime** - D1、KV、Queues、Cron、Workers AI 和 AI Gateway 全部运行在 Worker 架构

## Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, TanStack Start (SSR), TanStack Router |
| **Styling** | Tailwind CSS v4, shadcn/ui (base-nova) |
| **API Layer** | oRPC (end-to-end type-safe RPC) |
| **Database** | Cloudflare D1 + Drizzle ORM |
| **Authentication** | Better Auth (可选邮箱/OAuth能力) |
| **Caching** | Cloudflare KV |
| **Scheduling** | Cron Triggers + Cloudflare Queues |
| **AI** | Workers AI (`@cf/openai/gpt-oss-120b`) + AI Gateway + Vercel AI SDK structured output |
| **Deployment** | Cloudflare Workers + Wrangler |
| **Code Quality** | Biome + Ultracite |
| **Package Manager** | pnpm (monorepo workspaces) |

## Project Structure

```
x-hiring/
├── apps/
│   └── web/                      # Full-stack application (port 3002)
│       └── src/
│           ├── routes/           # File-based routing
│           │   ├── (app)/        # Recruitment pages
│           │   └── api/          # Health, ingestion, auth and RPC handlers
│           ├── components/
│           │   ├── ui/           # shadcn/ui components
│           │   ├── shared/       # Shared components
│           │   └── features/     # Feature-specific components
│           ├── lib/              # Utilities (auth-client, utils)
│           ├── hooks/            # Custom React hooks
│           └── stores/           # State management
│
├── packages/
│   ├── api/                      # oRPC entrypoints + routers/services
│   │   └── src/
│   │       ├── routers/          # Thin route handlers for app and auth APIs
│   │       ├── services/         # Recruitment domain business logic
│   │       └── lib/              # Shared server utilities
│   ├── auth/                     # Better Auth configuration
│   ├── db/                       # Drizzle database schema
│   ├── email/                    # React Email templates
│   └── common/                   # Shared types and validations
```

## Installation

### Prerequisites

- Node.js 24+
- pnpm 10+
- Cloudflare account (for remote D1 / Workers deploy)

### Setup

1. Clone the repository and install dependencies:

```bash
git clone <repository-url> x-hiring
cd x-hiring
pnpm install
```

2. Configure local Worker secrets:

```bash
cp apps/web/.dev.vars.example apps/web/.dev.vars
```

Edit `apps/web/.dev.vars` with your values (see [Environment Variables](#environment-variables) below).
For local TanStack Start + Cloudflare development, this is the preferred config source.
`apps/web/.env` is now only a legacy fallback for plain Node-based tooling.

3. Configure D1 in [`apps/web/wrangler.toml`](apps/web/wrangler.toml):

- Local development uses the checked-in `env.development` D1 binding together with `.wrangler/state`.
- Before running against a real Cloudflare database, replace `database_id` with your actual D1 database ID.
- Keep the binding name as `DB`, because the app and auth layer resolve D1 from that binding.

4. Initialize the local D1 schema:

```bash
pnpm run db:generate
pnpm run db:migrate
```

Optional seed data:

```bash
pnpm run db:seed
```

`db:seed` will reset the local D1 sample tables before inserting fresh demo data.

## Development

Start the development server:

```bash
pnpm run dev
```

Visit [http://localhost:3002](http://localhost:3002)

### Commands

```bash
# Development
pnpm run dev          # Start all apps (runs local D1 migrations, then vite dev with CLOUDFLARE_ENV=development)
pnpm run dev:web      # Start web app only

# Type Checking
pnpm run check-types  # Check TypeScript types across all packages

# Code Quality
pnpm run check        # Vite+ / Oxlint checks
vp fmt                # Format with Oxfmt
vp lint --fix         # Auto-fix lint issues

# Database
pnpm run db:generate            # Generate migration files
pnpm run db:migrate             # Alias of local D1 migration
pnpm run db:migrate:local       # Apply migrations to local D1 (development env)
pnpm run db:migrate:remote      # Apply migrations to remote D1 (development env)
pnpm run db:migrate:production  # Apply migrations to production D1
pnpm run db:seed                # Reset and seed local D1 with sample data
pnpm run cf-typegen             # Generate Wrangler/Cloudflare runtime types from development env
```

## Environment Variables

### Files and loading

- Use `apps/web/.dev.vars` for local Worker development with `vite dev` / Wrangler bindings.
- Keep non-secret runtime defaults in [`apps/web/wrangler.toml`](apps/web/wrangler.toml).
- `apps/web/.env` is only a fallback for plain Node-based tooling.
- In the Cloudflare runtime, server-side code reads Worker bindings/env first.
- Only variables prefixed with `VITE_` are exposed to the browser. **Never** put secrets in `VITE_` variables.

### Variable Reference

#### Core Configuration

| Variable | Required | Description | Notes |
|----------|----------|-------------|-------|
| `CORS_ORIGIN` | Yes | Allowed origin for auth and API requests | Set to your app URL in production (e.g. `https://your-domain.com`). |
| `BETTER_AUTH_URL` | Yes | Base URL used by Better Auth for redirects and emails | Should match the public URL of the app. |

#### Database (D1)

- D1 is configured through the `DB` binding in [`apps/web/wrangler.toml`](apps/web/wrangler.toml), not through `DATABASE_URL`.
- Local D1 state is persisted in `apps/web/.wrangler/state` after running migrations.
- Local development uses the `development` environment in Wrangler config.
- Replace the placeholder `database_id` values in Wrangler config before applying remote migrations or deploying.

#### Authentication

| Variable | Required | Description | Notes |
|----------|----------|-------------|-------|
| `BETTER_AUTH_SECRET` | Yes | Token signing secret | Generate with `pnpm dlx @better-auth/cli@latest secret` and keep it private. |
| `GITHUB_CLIENT_ID` | Optional | GitHub OAuth client ID | Needed for GitHub login. |
| `GITHUB_CLIENT_SECRET` | Optional | GitHub OAuth client secret | Needed for GitHub login; keep secret. |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID | Needed for Google login. |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret | Needed for Google login; keep secret. |

### API Namespaces

- `app.job.*`: job listing, detail, related-job and RSS data services
- `auth.*`: authentication-related endpoints retained by the Worker API

#### Ingestion

| Variable | Required | Description | Notes |
|----------|----------|-------------|-------|
| `INGESTION_TRIGGER_SECRET` | Optional | Secret for the protected manual ingestion trigger | Send as `Authorization: Bearer ...`; Cron and Queue execution do not use this HTTP secret. |
| `AI_JOB_MODEL` | Yes | Workers AI model used for job analysis | Current default is `@cf/openai/gpt-oss-120b`; override for a lower-latency model when needed. |
| `AI_GATEWAY_ID` | Yes | AI Gateway identifier | Used for caching and observability of AI requests. |

## Build

```bash
pnpm run build
```

Build output is located at `apps/web/dist/` (`client/` for static assets, `server/` for the server bundle).

## Deployment

This project is configured for Cloudflare Workers + D1 through the checked-in [`apps/web/wrangler.toml`](apps/web/wrangler.toml).

### Production Build

```bash
pnpm run build
```

### Cloudflare Deploy Checklist

1. Create real D1 databases in Cloudflare and set the `database_id` values in [`apps/web/wrangler.toml`](apps/web/wrangler.toml).
2. Apply the schema to the remote D1 database:

```bash
pnpm run db:migrate:production
```

3. Set production secrets with Wrangler, for example:

```bash
cd apps/web
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put INGESTION_TRIGGER_SECRET
```

4. Deploy the app:

```bash
pnpm run deploy
```

Wrangler will deploy the Worker plus the built client assets from `apps/web/dist/`.

## License

[Apache License 2.0](LICENSE)
