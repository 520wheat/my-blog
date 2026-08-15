# 我的博客

一个基于 Next.js 构建的个人博客，部署在 Cloudflare Workers。

博客地址：https://2025-blog-public.2058672418.workers.dev/

博客项目源仓库为：https://github.com/YYsuni/2025-blog-public

## 功能

- Markdown 文章编辑
- 图片上传与管理
- 站点信息、主题和首页布局配置
- 代码高亮与数学公式渲染
- 使用 GitHub 仓库存储文章和配置
- Cloudflare Workers 自动部署

## 技术栈

- Next.js
- React
- TypeScript
- Tailwind CSS
- OpenNext
- Cloudflare Workers

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
