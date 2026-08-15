export function normalizeBlogSlug(slug: string): string {
	try {
		return decodeURIComponent(slug)
	} catch {
		return slug
	}
}
