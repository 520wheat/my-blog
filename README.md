# 我的博客

一个基于 Next.js 构建的个人博客，部署在 Cloudflare Workers。

博客地址：https://520wheat.2058672418.workers.dev/

博客项目源仓库为：https://github.com/YYsuni/2025-blog-public

## 功能

- Markdown 文章编辑
- 图片上传与管理
- 站点信息、主题和首页布局配置
- 代码高亮与数学公式渲染
- 使用 GitHub 仓库存储文章和配置
- Cloudflare Workers 自动部署
- 访客留言墙与站长审核

## 技术栈

- Next.js
- React
- TypeScript
- Tailwind CSS
- OpenNext
- Cloudflare Workers
- Cloudflare D1

## 本地开发

```bash
pnpm install
pnpm run dev
```

## Cloudflare 部署

```bash
pnpm run build:cf
pnpm run deploy
```

Cloudflare Workers 构建命令：

```text
pnpm run build:cf
```

## GitHub App

博客使用 GitHub App 管理文章和网站配置。请勿将 GitHub App 的私钥上传到仓库，私钥应在博客配置页面中导入。

## 留言墙 D1 配置

首页头像卡片进入 `/live2d` 后会打开留言墙。访客提交的留言先进入待审核状态，站长在留言墙页面导入已有的 GitHub App Private key 后审核。

首次配置时，在项目目录执行：

```bash
pnpm exec wrangler login
pnpm exec wrangler d1 create 2025-blog-guestbook
```

将命令返回的数据库 UUID 写入 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "GUESTBOOK_DB"
database_name = "2025-blog-guestbook"
database_id = "填写上一步返回的 UUID"
```

然后初始化远程数据库：

```bash
pnpm exec wrangler d1 execute 2025-blog-guestbook --remote --file=migrations/0001_guestbook.sql
```

提交 `wrangler.toml` 的绑定配置并推送代码后，Cloudflare Workers Builds 会自动重新部署。
