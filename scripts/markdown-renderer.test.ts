import assert from 'node:assert/strict'
import test from 'node:test'
import * as markdownRenderer from '../src/lib/markdown-renderer.ts'

const { renderMarkdown } = markdownRenderer

test('renders Mermaid code blocks as diagram placeholders', async () => {
	const { html } = await renderMarkdown('```Mermaid\nflowchart TD\n  A[Start] --> B[End]\n```')

	assert.match(html, /data-mermaid-chart=/)
	assert.doesNotMatch(html, /data-code=/)
})

test('keeps ordinary code blocks as a single highlighted pre element', async () => {
	const { html } = await renderMarkdown('```ts\nconst answer = 42\n```')

	assert.match(html, /<pre data-code=/)
	assert.equal((html.match(/<pre\b/g) ?? []).length, 1)
	assert.equal((html.match(/<\/pre>/g) ?? []).length, 1)
	assert.match(html, /<span[^>]*>const<\/span>/)
})

test('keeps the complete pre element when preparing code block placeholders', async () => {
	const { html } = await renderMarkdown('```ts\nconst answer = 42\n```')
	const extractCodeBlockPlaceholders = (markdownRenderer as any).extractCodeBlockPlaceholders

	assert.equal(typeof extractCodeBlockPlaceholders, 'function')
	const { processedHtml, codeBlocks } = extractCodeBlockPlaceholders(html)

	assert.match(processedHtml, /__CODE_BLOCK_0__/)
	assert.match(codeBlocks[0].preHtml, /^<pre data-code=/)
	assert.match(codeBlocks[0].preHtml, /<code[\s\S]*<\/code><\/pre>$/)
})
