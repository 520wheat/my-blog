import { getCloudflareContext } from '@opennextjs/cloudflare'
import { GITHUB_CONFIG } from '@/consts'
import { canTransitionGuestbookStatus, type GuestbookNote, type GuestbookStatus } from './guestbook'

export type GuestbookRow = {
	id: string
	nickname: string
	content: string
	color: GuestbookNote['color']
	status: GuestbookStatus
	created_at: string
	approved_at: string | null
}

export async function getGuestbookDatabase(): Promise<D1Database | undefined> {
	const { env } = await getCloudflareContext({ async: true })
	return env.GUESTBOOK_DB
}

export function rowToGuestbookNote(row: GuestbookRow): GuestbookNote {
	return {
		id: row.id,
		nickname: row.nickname,
		content: row.content,
		color: row.color,
		status: row.status,
		createdAt: row.created_at,
		approvedAt: row.approved_at
	}
}

export function errorResponse(message: string, status: number) {
	return Response.json({ error: message }, { status })
}

export async function hasAdminAccess(request: Request): Promise<boolean> {
	const authorization = request.headers.get('authorization')
	if (!authorization?.startsWith('Bearer ')) return false

	const token = authorization.slice('Bearer '.length).trim()
	if (!token) return false

	try {
		const repository = `${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}`
		const response = await fetch(`https://api.github.com/repos/${repository}`, {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/vnd.github+json',
					'X-GitHub-Api-Version': '2022-11-28',
					'User-Agent': '2025-blog-public-guestbook'
				}
			})
		return response.ok
	} catch {
		return false
	}
}

export { canTransitionGuestbookStatus }
