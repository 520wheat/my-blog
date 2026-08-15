import { canTransitionGuestbookStatus } from '@/lib/guestbook'
import { errorResponse, getGuestbookDatabase, hasAdminAccess, rowToGuestbookNote, type GuestbookRow } from '@/lib/guestbook-server'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	if (!(await hasAdminAccess(request))) return errorResponse('需要管理员权限', 401)

	try {
		const { id } = await params
		const body = await request.json().catch(() => null)
		const action = body && typeof body === 'object' && 'action' in body ? body.action : null
		if (action !== 'approve' && action !== 'delete') return errorResponse('审核操作不正确', 400)

		const db = await getGuestbookDatabase()
		if (!db) return errorResponse('留言墙数据库尚未配置', 503)

		const current = await db.prepare('SELECT id, nickname, content, color, status, created_at, approved_at FROM guestbook_notes WHERE id = ?1').bind(id).first<GuestbookRow>()
		if (!current) return errorResponse('留言不存在', 404)

		const nextStatus = action === 'approve' ? 'approved' : 'deleted'
		if (!canTransitionGuestbookStatus(current.status, nextStatus)) return errorResponse('已删除的留言不能恢复', 409)

		if (action === 'approve') {
			await db.prepare("UPDATE guestbook_notes SET status = 'approved', approved_at = COALESCE(approved_at, ?1) WHERE id = ?2").bind(new Date().toISOString(), id).run()
		} else {
			await db.prepare("UPDATE guestbook_notes SET status = 'deleted' WHERE id = ?1").bind(id).run()
		}

		return Response.json({ note: rowToGuestbookNote({ ...current, status: nextStatus, approved_at: action === 'approve' ? current.approved_at || new Date().toISOString() : current.approved_at }) })
	} catch (error) {
		console.error('Failed to moderate guestbook note:', error)
		return errorResponse('审核失败，请稍后重试', 500)
	}
}
