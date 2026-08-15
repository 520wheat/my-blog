import { canTransitionGuestbookStatus, validateGuestbookInput } from '@/lib/guestbook'
import { errorResponse, getGuestbookDatabase, hasAdminAccess, rowToGuestbookNote, type GuestbookRow } from '@/lib/guestbook-server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
	try {
		const isAdmin = new URL(request.url).searchParams.get('admin') === '1'
		if (isAdmin && !(await hasAdminAccess(request))) return errorResponse('需要管理员权限', 401)

		const db = await getGuestbookDatabase()
		if (!db) return errorResponse('留言墙数据库尚未配置', 503)

		const query = isAdmin
			? `SELECT id, nickname, content, color, status, created_at, approved_at
				 FROM guestbook_notes WHERE status IN ('pending', 'approved') ORDER BY created_at DESC`
			: `SELECT id, nickname, content, color, status, created_at, approved_at
				 FROM guestbook_notes WHERE status = 'approved' ORDER BY created_at DESC`
		const result = await db.prepare(query).all<GuestbookRow>()

		return Response.json({ notes: (result.results ?? []).map(rowToGuestbookNote) })
	} catch (error) {
		console.error('Failed to load guestbook notes:', error)
		return errorResponse('留言加载失败，请稍后重试', 500)
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json().catch(() => null)
		const validation = validateGuestbookInput(body)
		if (!validation.ok) return errorResponse(validation.message, 400)

		const db = await getGuestbookDatabase()
		if (!db) return errorResponse('留言墙数据库尚未配置', 503)

		const { nickname, content, color } = validation.value
		const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
		const duplicate = await db
			.prepare('SELECT id FROM guestbook_notes WHERE nickname = ?1 AND content = ?2 AND created_at > ?3 LIMIT 1')
			.bind(nickname, content, cutoff)
			.first<{ id: string }>()
		if (duplicate) return errorResponse('相同留言请稍后再提交', 429)

		const note: GuestbookRow = {
			id: crypto.randomUUID(),
			nickname,
			content,
			color,
			status: 'pending',
			created_at: new Date().toISOString(),
			approved_at: null
		}
		await db
			.prepare('INSERT INTO guestbook_notes (id, nickname, content, color, status, created_at, approved_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)')
			.bind(note.id, note.nickname, note.content, note.color, note.status, note.created_at, note.approved_at)
			.run()

		return Response.json({ note: rowToGuestbookNote(note) }, { status: 201 })
	} catch (error) {
		console.error('Failed to create guestbook note:', error)
		return errorResponse('留言提交失败，请稍后重试', 500)
	}
}

export { canTransitionGuestbookStatus }
