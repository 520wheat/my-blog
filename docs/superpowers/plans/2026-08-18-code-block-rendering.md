# Article Code Block Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use sp-subagent-driven-development (recommended) or sp-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复普通 Markdown 代码块的嵌套 `<pre>` 结构，让文章中的浅色代码面板占满可用宽度、支持长代码横向滚动，并保持复制按钮可用。

**Architecture:** `renderMarkdown` 继续在服务端使用 Shiki 高亮，但把 Shiki 返回的完整 `<pre>` 拆成其 `<code>` 内容后再生成唯一的外层 `<pre data-code>`. `extractCodeBlockPlaceholders` 保留这个完整 `<pre>` 交给客户端 `CodeBlock`，避免客户端解析时丢失块级结构；`article.css` 负责面板布局、滚动和复制按钮的焦点/响应式状态。

**Tech Stack:** Next.js 16, TypeScript, marked 17, Shiki 3, React 19, lucide-react, Node built-in test runner.

## Global Constraints

- 保留现有浅色文章主题、Shiki `one-light` token 样式和 lucide 复制图标。
- Mermaid、行内代码、文章正文结构和依赖清单不变。
- 不将 `public/images/ai-agent-pipeline-cover.png` 或 `.svg` 纳入提交。
- 先写并验证失败测试，再写生产代码。

---

### Task 1: Lock down the rendered HTML contract

**Files:**
- Modify: `scripts/markdown-renderer.test.ts`
- Test: `scripts/markdown-renderer.test.ts`

**Interfaces:**
- Consumes: `renderMarkdown(markdown: string)` from `src/lib/markdown-renderer.ts`.
- Produces: a regression test proving ordinary highlighted blocks contain one `<pre>`, retain `data-code`, and retain Shiki token markup.

- [ ] **Step 1: Write the failing test**

Extend the ordinary code block test so it counts `<pre>` tags and asserts that the rendered HTML has exactly one opening `<pre>` and one closing `</pre>`:

```ts
test('keeps ordinary code blocks as a single highlighted pre element', async () => {
	const { html } = await renderMarkdown('```ts\nconst answer = 42\n```')

	assert.match(html, /<pre data-code=/)
	assert.equal((html.match(/<pre\b/g) ?? []).length, 1)
	assert.equal((html.match(/<\/pre>/g) ?? []).length, 1)
	assert.match(html, /<span[^>]*>const<\/span>/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test scripts/markdown-renderer.test.ts`

Expected: the Mermaid test passes, while the ordinary code block test fails because the current Shiki output is nested inside the renderer's outer `<pre>`.

- [ ] **Step 3: Commit the failing test**

```bash
git add scripts/markdown-renderer.test.ts
git commit -m "test: cover single pre code block structure"
```

### Task 2: Flatten Shiki output to one code block element

**Files:**
- Modify: `src/lib/markdown-renderer.ts:84-99`
- Modify: `src/hooks/use-markdown-render.tsx:27-48`
- Test: `scripts/markdown-renderer.test.ts`

**Interfaces:**
- Consumes: Shiki HTML strings returned by `shiki.codeToHtml`.
- Produces: `renderMarkdown` HTML with one `<pre data-code="...">` wrapping Shiki's `<code>` element contents.

- [ ] **Step 1: Extract the Shiki code element before storing it**

In the `renderer.code` path, keep the existing `codeBlockMap` contract but normalize `codeData.html` before returning it. Remove the outer `<pre ...>` wrapper from Shiki's result by matching its single `<code ...>...</code>` element and return:

```ts
return `<pre data-code="${escapedCode}"><code${codeMatch[1]}>${codeMatch[2]}</code></pre>`
```

If the match is unavailable, keep the existing highlighted HTML as the inner content so rendering still succeeds.

- [ ] **Step 2: Preserve the complete pre element for the client replacement path**

Move the existing `html.replace(/<pre.../)` placeholder extraction from `useMarkdownRender` into an exported `extractCodeBlockPlaceholders(html: string)` helper in `src/lib/markdown-renderer.ts`. The helper must store `preHtml: match`, not `preHtml: content`, while keeping the existing entity decoding and placeholder format. Update `useMarkdownRender` to consume `{ processedHtml, codeBlocks }` from this helper. This keeps `CodeBlock` rendering as `.code-block-wrapper > pre > code`.

- [ ] **Step 3: Run the focused regression test**

Run: `node --experimental-strip-types --test scripts/markdown-renderer.test.ts`

Expected: all Mermaid and ordinary code block tests pass with zero failures.

- [ ] **Step 4: Commit the renderer fix**

```bash
git add src/lib/markdown-renderer.ts src/hooks/use-markdown-render.tsx scripts/markdown-renderer.test.ts
git commit -m "fix: flatten highlighted code block markup"
```

### Task 3: Correct code panel layout and interaction states

**Files:**
- Modify: `src/styles/article.css:110-203`

**Interfaces:**
- Consumes: the single `<pre>` structure rendered by `CodeBlock`.
- Produces: a full-width light code panel with contained horizontal scrolling, a non-obstructive top-right copy button, and visible keyboard focus.

- [ ] **Step 1: Make the panel the scroll container**

Keep the existing article palette and spacing, but set `.prose .code-block-wrapper` to `width: 100%`, `max-width: 100%`, and `overflow: hidden`; set `.prose .code-block-wrapper > pre` to `width: 100%`, `max-width: 100%`, and `overflow-x: auto`. Remove the generic nested-pre dependency so the visible background belongs to the single outer panel.

- [ ] **Step 2: Keep the copy control inside the panel across breakpoints**

Retain the absolute top-right position and existing 32px control size, add `touch-action: manipulation`, and preserve the panel's right padding so the control never covers the first visible code characters. Add a `:focus-visible` rule with the existing brand color for keyboard users; keep hover reveal behavior and show the control on narrow screens where hover is unavailable.

- [ ] **Step 3: Run formatting and style checks available in the repository**

Run: `npx prettier --check src/lib/markdown-renderer.ts src/styles/article.css scripts/markdown-renderer.test.ts`

Expected: Prettier reports all three files formatted. If the existing CSS nesting is not accepted by Prettier, preserve the repository's current style and run the project build in Task 4 as the authoritative CSS check.

- [ ] **Step 4: Commit the layout fix**

```bash
git add src/styles/article.css
git commit -m "fix: stabilize article code block layout"
```

### Task 4: Verify the complete article rendering path

**Files:**
- Verify: `src/components/code-block.tsx`
- Verify: `src/hooks/use-markdown-render.tsx`
- Verify: `src/components/blog-preview.tsx`
- Verify: `src/app/blog/[id]/page.tsx`

**Interfaces:**
- Consumes: the updated Markdown HTML and existing `CodeBlock` replacement path.
- Produces: evidence that writing preview and published article paths both use the corrected block.

- [ ] **Step 1: Run the focused regression test**

Run: `node --experimental-strip-types --test scripts/markdown-renderer.test.ts`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run the production build**

Run: `pnpm build`

Expected: Next.js production build exits with code 0.

- [ ] **Step 3: Run the Impeccable mechanical detector**

Run: `node /Users/mac/.codex/skills/impeccable/scripts/detect.mjs --json src/components/code-block.tsx src/styles/article.css src/lib/markdown-renderer.ts`

Expected: no new high-severity findings for the changed UI. Treat any detector warning as a review item and fix only findings caused by this change.

- [ ] **Step 4: Inspect desktop and narrow layouts**

Start the app with `pnpm dev`, open an article containing a `ts` fenced block and a long line, and verify:

- the code block has one continuous light background spanning the article width;
- long lines scroll horizontally inside the block without widening the page;
- the copy button stays in the top-right corner, copies the original source, and exposes a visible focus ring with keyboard navigation;
- the same behavior appears in the writing preview and published article route;
- Mermaid diagrams and inline code retain their existing rendering.

- [ ] **Step 5: Review the final diff and preserve unrelated files**

Run: `git status --short && git diff HEAD~3 --check`

Expected: only the design/plan documentation and the three scoped implementation/test files are committed; the two pre-existing untracked cover image files remain untracked.
