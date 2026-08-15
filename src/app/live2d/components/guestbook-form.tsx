'use client'

import { useState } from 'react'
import { Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { DialogModal } from '@/components/dialog-modal'
import { GUESTBOOK_COLORS, type GuestbookColor } from '@/lib/guestbook'
import { submitNote } from '../services/guestbook-api'

interface GuestbookFormProps {
	onClose: () => void
	onSubmitted: () => Promise<void>
}

export function GuestbookForm({ onClose, onSubmitted }: GuestbookFormProps) {
	const [nickname, setNickname] = useState('')
	const [content, setContent] = useState('')
	const [color, setColor] = useState<GuestbookColor>(GUESTBOOK_COLORS[0])
	const [saving, setSaving] = useState(false)

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setSaving(true)
		try {
			await submitNote({ nickname, content, color })
			await onSubmitted()
			toast.success('留言已提交，等待审核后会显示在墙上')
			onClose()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : '留言提交失败')
		} finally {
			setSaving(false)
		}
	}

	return (
		<DialogModal open onClose={onClose} className='card w-[min(420px,calc(100vw-32px))] p-6'>
			<form className='space-y-5' onSubmit={handleSubmit}>
				<div className='flex items-center justify-between'>
					<div>
						<p className='text-secondary text-xs uppercase tracking-[0.2em]'>Guestbook</p>
						<h2 className='mt-1 text-xl font-semibold'>写一张便利贴</h2>
					</div>
					<button type='button' onClick={onClose} aria-label='关闭' className='rounded-full p-2 transition-colors hover:bg-black/5'>
						<X className='size-4' />
					</button>
				</div>

				<label className='block text-sm'>
					<span className='mb-2 block font-medium'>昵称</span>
					<input value={nickname} onChange={event => setNickname(event.target.value)} maxLength={24} required placeholder='怎么称呼你？' className='bg-secondary/10 w-full rounded-xl border px-4 py-3 outline-none focus:border-brand' />
				</label>

				<label className='block text-sm'>
					<span className='mb-2 block font-medium'>留言</span>
					<textarea value={content} onChange={event => setContent(event.target.value)} maxLength={500} required rows={5} placeholder='写下你想说的话...' className='bg-secondary/10 w-full resize-none rounded-xl border px-4 py-3 outline-none focus:border-brand' />
				</label>

				<div>
					<span className='mb-2 block text-sm font-medium'>便签颜色</span>
					<div className='flex gap-3'>
						{GUESTBOOK_COLORS.map(item => (
							<button
								key={item}
								type='button'
								aria-label={`选择${item}便签`}
								aria-pressed={color === item}
								onClick={() => setColor(item)}
								className='size-8 rounded-full border-2 border-white shadow-sm ring-offset-2 transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-brand'
								style={{ backgroundColor: item }}
							/>
						))}
					</div>
				</div>

				<button type='submit' disabled={saving} className='brand-btn flex w-full items-center justify-center gap-2 px-4 py-3 disabled:cursor-wait disabled:opacity-60'>
					<Send className='size-4' />
					{saving ? '提交中...' : '提交留言'}
				</button>
			</form>
		</DialogModal>
	)
}
