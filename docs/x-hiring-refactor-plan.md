# X-Hiring 全量重构执行计划

## 目标与边界

- 以 `apps/web` 的 TanStack Start + Vite + Cloudflare Worker 为唯一运行架构。
- 保留现有招聘页面的 UI、交互和信息结构；只迁移页面所依赖的 API、数据访问、认证、缓存、采集和部署边界。
- 统一使用 Cloudflare D1、KV、Queues、Workers AI、AI Gateway、Cron Triggers 和 Worker Secrets。
- D1 是新系统的唯一数据源；本次不迁移历史 PostgreSQL 数据，也不把旧数据库作为运行时依赖。

## 上一版线上验证状态（2026-08-20）

- 开发 Worker：`x-hiring-web-dev`，版本 `a2c7697b-c942-42af-98da-b36b913cb939`。
- 生产 Worker：`x-hiring-web`，版本 `3bad6be9-9329-4130-8a19-b4f401fc75d1`。
- 开发 D1：14 条职位、347 个标签、1 次成功采集、0 次失败采集。
- 生产 D1：19 条职位、441 个标签、3 次成功采集、0 次失败采集；首批数据直接由 V2EX、电鸭和谁在招人采集写入。
- 线上 smoke：首页、详情、搜索、RSS、健康检查通过；未授权采集触发返回 401；已移除模板入口返回 404。自动化测试为 3 个测试文件、10 项通过。

## 阶段与完成门槛

### 1. 基础架构统一

- [x] 迁移到 TanStack Start / Vite / Worker entrypoint。
- [x] 使用 Drizzle + D1 schema/migrations 替换运行时 Prisma 数据访问。
- [x] 使用 Worker 原生环境绑定注入 D1、KV、Queue、AI 和 Secrets。
- [x] 为所有外部采集请求增加超时，并交由 Queue 重试机制处理网络悬挂。
- [x] 将公开 RPC 收敛为 X-Hiring 招聘路由，模板 panel、支付和 R2 路由不再进入 Worker runtime graph。
- [x] 保留旧页面组件在 `legacy-job-*` 兼容边界内，不做 UI 重设计。

### 2. 数据模型与 D1 初始化

- [x] 将 `Job`、`tags`、`fullTags` 映射到 `jobs` 和规范化 `job_tags`。
- [x] 保留旧 Prisma JSON exporter 和 D1 幂等 SQL importer 作为独立的应急工具，不进入本次发布门槛。
- [x] 在开发 D1 用 fixture 验证日期、状态、摘要、浏览量和标签映射。
- [x] 生产 D1 基础 migration 已执行完成，schema 与索引已验证；本轮生成的 `0002_yellow_post.sql`（移除 Polar）、`0003_typical_jackpot.sql`（拆分工作类型字段）和 `0004_groovy_pet_avengers.sql`（拆分地点、岗位、薪资、年薪、性别、学历字段）尚待发布前应用。
- [x] 生产 D1 已直接完成首次 V2EX、电鸭、谁在招人采集，三条 `ingestion_runs` 均成功。

### 3. 采集、AI、缓存和定时运行时

- [x] V2EX、电鸭、谁在招人适配为 Worker fetch + queue task。
- [x] Cron 按来源拆分任务，Queue consumer 负责重试和 DLQ。
- [x] Workers AI 使用当前可用模型配置，并通过默认 AI Gateway 统一缓存与日志。
- [x] RSS 使用 Cloudflare KV 短缓存；成功采集后清除缓存。
- [x] 验证 AI 结构化输出解析、Gateway 参数透传、D1 幂等写入。
- [x] 使用真实来源执行一次开发环境采集，确认 Gateway、AI 结果、Queue 状态和 `ingestion_runs` 完整闭环；可通过受 Bearer Secret 保护的 `POST /api/ingestion/trigger` 立即触发，不绕过 Queue。

### 4. 应用验收

- [x] 开发 Worker 验证首页、详情、RSS、健康检查。
- [x] 验证搜索参数和首页读取 D1。
- [x] 验证详情和相关职位读取规范化标签。
- [x] 验证重复导入不会产生重复职位或标签。
- [x] 使用生产首次采集数据验证首页、搜索、详情、RSS 和相关职位边界数据。
- [ ] 对旧线上页面做人工 UI 对照；若旧域名仍不可访问，则使用仓库截图/fixture 作为替代证据。

### 5. 生产切换与回滚

- [x] 开发 Worker 已部署：`x-hiring-web-dev`。
- [x] 生产 Worker 已部署：`x-hiring-web`。
- [x] 生产 D1 完成首次真实采集并通过烟囱测试。
- [ ] `x-hiring.hehehai.cn` DNS 传播完成后再绑定生产 Worker custom domain；在此之前使用官方 `workers.dev` URL。
- [x] 由于没有旧 PostgreSQL 运行时和历史数据迁移范围，本次不设置旧服务只读切换窗口。
- [x] 使用 `workers.dev` 验证首页、职位详情、RSS、搜索、健康检查、Queue 采集和错误边界。
- [x] 回滚条件已定义：生产错误率、详情 404、采集失败率或数据一致性不达标时停止触发器并回滚 Worker 版本，保留 D1 数据供排查。

## 当前状态与后续

核心重构、D1 初始化、生产首次采集和 `workers.dev` 验收已完成。本轮代码修复已在本地通过构建、类型、测试和 Cloudflare dry-run；部署前需要先应用 `0002_yellow_post.sql`、`0003_typical_jackpot.sql` 和 `0004_groovy_pet_avengers.sql`，再发布新的 Worker。`hehehai.cn` 的 DNS 修改仍在传播验证中，但不阻塞 Worker 使用；传播完成后再补绑 `x-hiring.hehehai.cn` custom domain，并重复一次健康检查和登录回调检查。

后续只允许继续做 Cloudflare 侧运维工作：观察 Cron/Queue/DLQ、按需升级依赖、补绑 custom domain。历史 PostgreSQL 导出和历史数据导入不属于本次范围。

禁止提交 `.env`、`.dev.vars`、Secret、PostgreSQL URL 或完整数据导出文件。
