# Article Code Block Rendering Design

## Goal

修复博客文章普通代码块的 HTML 结构和布局，使代码块在浅色文章主题中以完整宽度的独立面板显示，长代码可横向滚动，复制按钮固定在面板右上角，同时保持 Mermaid、行内代码和其他文章内容不变。

## Current Issue

Shiki 的 `codeToHtml` 已经返回完整的 `<pre>...</pre>`。当前 Markdown 渲染器又将这段 HTML 放入外层 `<pre data-code>...</pre>`，形成嵌套 `<pre>`。浏览器对这种结构的布局处理会导致代码背景只覆盖内容行、宽度异常以及复制按钮相对位置不稳定。

## Design

在服务端 Markdown 渲染阶段，从 Shiki 返回值中提取内部 `<code>...</code>` 内容及其属性，再由现有的 `data-code` 外层 `<pre>` 统一承载高亮代码。这样普通代码块最终只包含一个 `<pre>`，同时保留 Shiki 的 token 样式。

现有 `CodeBlock` 组件继续负责复制状态和复制行为。文章样式保持浅色视觉，只调整代码块的布局约束：外层面板占满文章内容宽度，内部代码允许横向滚动，复制按钮位于面板右上角，并提供键盘聚焦可见状态；按钮尺寸和图标沿用现有 lucide 组件。

## Scope

- 修改 `src/lib/markdown-renderer.ts`，避免普通 Shiki 代码块产生嵌套 `<pre>`。
- 修改 `src/styles/article.css`，修正代码面板和复制按钮的布局、滚动及焦点状态。
- 扩展 `scripts/markdown-renderer.test.ts`，断言普通代码块只包含一个 `<pre>`，并继续保留 `data-code`。
- 不修改 Mermaid 渲染、行内代码、文章正文结构或新增依赖。

## Verification

先运行 Markdown 渲染回归测试，确认新增断言在修复前失败、修复后通过；再运行完整项目构建。启动本地页面后分别检查桌面和窄屏文章中的普通代码块，确认代码面板宽度、横向滚动、复制成功状态和键盘焦点均可用，并运行 Impeccable 的机械检测器检查改动后的 UI 文件。
