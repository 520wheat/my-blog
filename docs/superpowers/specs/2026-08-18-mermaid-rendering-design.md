# Mermaid 渲染设计

## 目标

让文章 Markdown 中的 `mermaid` fenced code block 在文章详情页和写作预览中显示为 Mermaid 图表，同时保持普通代码块现有的 Shiki 高亮与复制功能。

## 范围

- 支持代码块语言标记 `mermaid` 的大小写变体。
- 文章详情页和写作预览共用同一套渲染逻辑。
- 普通代码块行为不变。
- 不增加 Mermaid 编辑器、图表导出、交互式缩放或服务端 SVG 持久化。

## 方案

在现有 `src/lib/markdown-renderer.ts` 中识别 Mermaid 代码块，并输出带有原始图表文本的数据属性的占位元素。`src/hooks/use-markdown-render.tsx` 在解析 HTML 时将该占位元素替换为一个客户端 Mermaid 组件。

Mermaid 组件在浏览器中按需加载固定版本的 Mermaid CDN UMD 文件，初始化并渲染 SVG。这样 Mermaid 不会进入 Cloudflare Worker 的 Worker bundle，也不会改变现有 Shiki 和 KaTeX 的服务端兼容处理。

由于 Cloudflare 免费 Workers 的 Worker 脚本大小限制，不能将 Mermaid npm bundle 打进 Worker；图表渲染失败或 CDN 不可用时会回退到原始代码。

## 数据流

1. `marked` 识别 Markdown fenced code block。
2. `renderMarkdown` 将 `mermaid` 代码块输出为 Mermaid 占位元素；其他代码块继续交给 Shiki。
3. `useMarkdownRender` 使用 `html-react-parser` 将占位元素替换为 Mermaid 组件。
4. Mermaid 组件在浏览器端生成 SVG 并显示。

## 错误处理

- Mermaid 图表语法错误时，不影响整篇文章渲染。
- 错误位置显示原始 Mermaid 文本和简短错误提示，便于作者修正。
- Mermaid 依赖加载失败时，同样回退到可读的原始代码块。
- Mermaid 图表使用唯一渲染 ID，避免同一页面多个图表互相覆盖。

## 样式

新增最少量文章样式，使图表在文章宽度内可滚动、居中显示，并适配现有明暗主题。普通代码和文章其他元素样式不变。

## 验证

- 单元级检查：Mermaid fenced block 被识别，普通代码块仍保留 `pre` 渲染路径。
- 构建检查：`pnpm run build:cf` 通过。
- 页面检查：写作预览和文章详情页各验证一个 Mermaid 图表，确认生成 SVG；再验证一段普通代码仍可高亮和复制。
