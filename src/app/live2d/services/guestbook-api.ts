import type { GuestbookColor, GuestbookNote } from '@/lib/guestbook'

type NotesResponse = { notes: GuestbookNote[] }

async function readResponse<T>(response: Response): Promise<T> {
	const data = (await response.json().catch(() => null)) as { error?: string } | T | null
	if (!response.ok) {
		throw new Error(data && typeof data === 'object' && 'error' in data ? data.error || '请求失败' : '请求失败')
	}
	return data as T
}

export async function fetchNotes(): Promise<GuestbookNote[]> {
	const response = await fetch('/api/guestbook', { cache: 'no-store' })
	return (await readResponse<NotesResponse>(response)).notes
}

export async function submitNote(input: { nickname: string; content: string; color: GuestbookColor }): Promise<GuestbookNote> {
	const response = await fetch('/api/guestbook', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	})
	return (await readResponse<{ note: GuestbookNote }>(response)).note
}

export async function fetchAdminNotes(token: string): Promise<GuestbookNote[]> {
	const response = await fetch('/api/guestbook?admin=1', {
		cache: 'no-store',
		headers: { Authorization: `Bearer ${token}` }
	})
	return (await readResponse<NotesResponse>(response)).notes
}

export async function moderateNote(id: string, action: 'approve' | 'delete', token: string): Promise<GuestbookNote> {
	const response = await fetch(`/api/guestbook/${encodeURIComponent(id)}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ action })
	})
	return (await readResponse<{ note: GuestbookNote }>(response)).note
}
