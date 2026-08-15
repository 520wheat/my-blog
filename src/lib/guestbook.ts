export const GUESTBOOK_COLORS = ['#fff3b0', '#ffd6a5', '#caffbf', '#bde0fe', '#e4c1f9'] as const

export type GuestbookColor = (typeof GUESTBOOK_COLORS)[number]
export type GuestbookStatus = 'pending' | 'approved' | 'deleted'

export type GuestbookNote = {
	id: string
	nickname: string
	content: string
	color: GuestbookColor
	status: GuestbookStatus
	createdAt: string
	approvedAt?: string | null
}

export const MAX_NICKNAME_LENGTH = 24
export const MAX_CONTENT_LENGTH = 500

export function canTransitionGuestbookStatus(current: GuestbookStatus, next: GuestbookStatus) {
	if (current === 'deleted') return false
	if (next === 'approved') return current === 'pending' || current === 'approved'
	if (next === 'deleted') return true
	return false
}

export function validateGuestbookInput(input: unknown) {
	if (!input || typeof input !== 'object') return { ok: false as const, message: '留言格式不正确' }

	const value = input as Record<string, unknown>
	const nickname = typeof value.nickname === 'string' ? value.nickname.trim() : ''
	const content = typeof value.content === 'string' ? value.content.trim() : ''
	const color = value.color

	if (!nickname || nickname.length > MAX_NICKNAME_LENGTH) {
		return { ok: false as const, message: '昵称不能为空且不能超过 24 个字' }
	}
	if (!content || content.length > MAX_CONTENT_LENGTH) {
		return { ok: false as const, message: '留言不能为空且不能超过 500 个字' }
	}
	if (!GUESTBOOK_COLORS.includes(color as GuestbookColor)) {
		return { ok: false as const, message: '便签颜色不正确' }
	}

	return { ok: true as const, value: { nickname, content, color: color as GuestbookColor } }
}
