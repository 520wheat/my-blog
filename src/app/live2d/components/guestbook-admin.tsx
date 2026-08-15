'use client'

import { useRef, useState } from 'react'
import { Check, KeyRound, Settings2, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { DialogModal } from '@/components/dialog-modal'
import { useAuthStore } from '@/hooks/use-auth'
import { getAuthToken } from '@/lib/auth'
import type { GuestbookNote } from '@/lib/guestbook'
import { fetchAdminNotes, moderateNote } from '../services/guestbook-api'

export function GuestbookAdmin() {
	const keyInputRef = useRef<HTMLInputElement>(null)
	const { isAuth, setPrivateKey, clearAuth } = useAuthStore()
	const [open, setOpen] = useState(false)
	const [notes, setNotes] = useState<GuestbookNote[]>([])
	const [loading, setLoading] = useState(false)
	const [workingId, setWorkingId] = useState<string | null>(null)

	const loadNotes = async () => {
		setLoading(true)
		try {
			const token = await getAuthToken()
			setNotes(await fetchAdminNotes(token))
		} catch (error) {
			if (error instanceof Error && error.message.includes('管理员')) clearAuth()
			toast.error(error instanceof Error ? error.message : '管理留言加载失败')
		} finally {
			setLoading(false)
		}
	}

	const openPanel = async () => {
		setOpen(true)
		await loadNotes()
	}

	const handleKey = async (file: File) => {
		try {
			await setPrivateKey(await file.text())
			await openPanel()
		} catch {
			toast.error('读取密钥文件失败')
		}
	}

	const handleModerate = async (note: GuestbookNote, action: 'approve' | 'delete') => {
		setWorkingId(note.id)
		try {
			const token = await getAuthToken()
			await moderateNote(note.id, action, token)
			await loadNotes()
			toast.success(action === 'approve' ? '留言已通过' : '留言已删除')
		} catch (error) {
			toast.error(error instanceof Error ? error.message : '审核失败')
		} finally {
			setWorkingId(null)
		}
	}

	return (
		<>
			<input ref={keyInputRef} type='file' accept='.pem' className='hidden' onChange={async event => {
				const file = event.target.files?.[0]
				if (file) await handleKey(file)
				event.currentTarget.value = ''
			}} />
			<button type='button' onClick={() => (isAuth ? openPanel() : keyInputRef.current?.click())} className='flex items-center gap-2 rounded-xl border bg-white/60 px-4 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'>
				{isAuth ? <Settings2 className='size-4' /> : <KeyRound className='size-4' />}
				{isAuth ? '管理留言' : '导入密钥'}
			</button>

			<DialogModal open={open} onClose={() => setOpen(false)} className='card w-[min(620px,calc(100vw-32px))] p-6'>
				<div className='flex items-center justify-between'>
					<div>
						<p className='text-secondary text-xs uppercase tracking-[0.2em]'>Moderation</p>
						<h2 className='mt-1 text-xl font-semibold'>留言管理</h2>
					</div>
					<button type='button' onClick={() => setOpen(false)} aria-label='关闭' className='rounded-full p-2 transition-colors hover:bg-black/5'><X className='size-4' /></button>
				</div>

				<div className='mt-5 max-h-[60vh] space-y-3 overflow-y-auto pr-1'>
					{loading && <p className='text-secondary py-8 text-center text-sm'>正在加载...</p>}
					{!loading && notes.length === 0 && <p className='text-secondary py-8 text-center text-sm'>暂无待审核留言</p>}
					{!loading && notes.map(note => (
						<article key={note.id} className='rounded-xl border p-4' style={{ borderLeftColor: note.color, borderLeftWidth: 8 }}>
							<div className='flex items-start justify-between gap-3'>
								<div className='min-w-0'>
									<p className='font-medium'>@{note.nickname} <span className='text-secondary ml-2 text-xs'>{note.status === 'pending' ? '待审核' : '已发布'}</span></p>
									<p className='mt-2 whitespace-pre-wrap break-words text-sm leading-6'>{note.content}</p>
								</div>
								<div className='flex shrink-0 gap-2'>
									{note.status === 'pending' && <button type='button' disabled={workingId === note.id} onClick={() => handleModerate(note, 'approve')} aria-label='通过留言' className='rounded-full bg-emerald-100 p-2 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50'><Check className='size-4' /></button>}
									<button type='button' disabled={workingId === note.id} onClick={() => handleModerate(note, 'delete')} aria-label='删除留言' className='rounded-full bg-red-100 p-2 text-red-700 hover:bg-red-200 disabled:opacity-50'><Trash2 className='size-4' /></button>
								</div>
							</div>
						</article>
					))}
				</div>
			</DialogModal>
		</>
	)
}
