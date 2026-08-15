'use client'

import { useCallback, useEffect, useState } from 'react'
import { PenLine, RefreshCw } from 'lucide-react'
import { motion } from 'motion/react'
import { GuestbookAdmin } from './components/guestbook-admin'
import { GuestbookForm } from './components/guestbook-form'
import { GuestbookWall } from './components/guestbook-wall'
import { fetchNotes } from './services/guestbook-api'
import type { GuestbookNote } from '@/lib/guestbook'

export default function Live2DPage() {
	const [notes, setNotes] = useState<GuestbookNote[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [formOpen, setFormOpen] = useState(false)

	const loadNotes = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			setNotes(await fetchNotes())
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : '留言加载失败')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void loadNotes()
	}, [loadNotes])

	return (
		<>
			<GuestbookWall notes={notes} loading={loading} error={error} />
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className='fixed top-4 right-6 z-30 flex items-center gap-2 max-sm:top-20 max-sm:right-4'>
				<button type='button' onClick={() => setFormOpen(true)} className='brand-btn flex items-center gap-2 px-4 py-2 text-sm'>
					<PenLine className='size-4' />
					写留言
				</button>
				<GuestbookAdmin />
				{error && <button type='button' onClick={() => void loadNotes()} aria-label='重新加载留言' className='rounded-xl border bg-white/60 p-2 backdrop-blur-sm hover:bg-white/80'><RefreshCw className='size-4' /></button>}
			</motion.div>
			{formOpen && <GuestbookForm onClose={() => setFormOpen(false)} onSubmitted={loadNotes} />}
		</>
	)
}
