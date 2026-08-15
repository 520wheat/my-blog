import type { BlogConfig } from '@/app/blog/types'
import { normalizeBlogSlug } from './blog-slug'

export type { BlogConfig } from '@/app/blog/types'

export type LoadedBlog = {
	slug: string
	config: BlogConfig
	markdown: string
	cover?: string
}

/**
 * Load blog data from public/blogs/{slug}
 * Used by both view page and edit page
 */
export async function loadBlog(slug: string): Promise<LoadedBlog> {
	if (!slug) {
		throw new Error('Slug is required')
	}
	const normalizedSlug = normalizeBlogSlug(slug)

	// Load config.json
	let config: BlogConfig = {}
	const configRes = await fetch(`/blogs/${encodeURIComponent(normalizedSlug)}/config.json`)
	if (configRes.ok) {
		try {
			config = await configRes.json()
		} catch {
			config = {}
		}
	}

	// Load index.md
	const mdRes = await fetch(`/blogs/${encodeURIComponent(normalizedSlug)}/index.md`)
	if (!mdRes.ok) {
		throw new Error('Blog not found')
	}
	const markdown = await mdRes.text()

	return {
		slug: normalizedSlug,
		config,
		markdown,
		cover: config.cover
	}
}
