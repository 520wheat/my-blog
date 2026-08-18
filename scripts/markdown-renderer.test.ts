import assert from 'node:assert/strict'
import test from 'node:test'
import { renderMarkdown } from '../src/lib/markdown-renderer.ts'

test('renders Mermaid code blocks as diagram placeholders', async () => {
	const { html } = await renderMarkdown('```Mermaid\nflowchart TD\n  A[Start] --> B[End]\n```')

	assert.match(html, /data-mermaid-chart=/)
	assert.doesNotMatch(html, /data-code=/)
})

test('keeps ordinary code blocks on the existing highlighted path', async () => {
	const { html } = await renderMarkdown('```ts\nconst answer = 42\n```')

	assert.match(html, /<pre data-code=/)
})
