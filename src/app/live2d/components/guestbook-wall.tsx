'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useCenterInit, useCenterStore } from '@/hooks/use-center'
import { useSize } from '@/hooks/use-size'
import type { GuestbookNote } from '@/lib/guestbook'

interface GuestbookWallProps {
	notes: GuestbookNote[]
	loading: boolean
	error: string | null
}

function hash(value: string) {
	let result = 0
	for (const char of value) result = (result * 31 + char.charCodeAt(0)) | 0
	return Math.abs(result)
}

function formatDate(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function StickyNote({ note, index, mobile = false }: { note: GuestbookNote; index: number; mobile?: boolean }) {
	const seed = hash(note.id)
	const rotation = (seed % 13) - 6

	if (mobile) {
		return (
			<motion.article
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: index * 0.04 }}
				style={{ backgroundColor: note.color, rotate: rotation }}
				className='min-h-44 w-full p-5 text-left shadow-lg'>
				<NoteContent note={note} />
			</motion.article>
		)
	}

	return (
		<motion.article
			drag
			dragMomentum={false}
			initial={{ opacity: 0, scale: 0.75, x: 0, y: 12 }}
			animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
			transition={{ delay: index * 0.05, type: 'spring', stiffness: 180, damping: 18 }}
			whileHover={{ scale: 1.04, zIndex: 20 }}
			style={{ backgroundColor: note.color, rotate: rotation }}
			className='absolute left-1/2 top-1/2 z-10 min-h-44 w-[220px] -translate-x-1/2 -translate-y-1/2 cursor-grab p-5 text-left shadow-lg active:cursor-grabbing'>
			<NoteContent note={note} />
		</motion.article>
	)
}

function NoteContent({ note }: { note: GuestbookNote }) {
	return (
		<>
			<div className='mb-5 flex items-center justify-between gap-2 text-xs text-black/55'>
				<span className='truncate font-medium'>@{note.nickname}</span>
				<time dateTime={note.createdAt}>{formatDate(note.createdAt)}</time>
			</div>
			<p className='whitespace-pre-wrap break-words text-[15px] leading-6 text-black/80'>{note.content}</p>
			<div className='mt-8 text-right text-xl text-black/35'>✦</div>
		</>
	)
}

export function GuestbookWall({ notes, loading, error }: GuestbookWallProps) {
	useCenterInit()
	const { width, height } = useCenterStore()
	const { maxSM } = useSize()

	const positions = useMemo(() => {
		return notes.map(note => {
			const seed = hash(note.id)
			const angle = (seed % 360) * (Math.PI / 180)
			const radius = 80 + (seed % 230)
			return {
				left: Math.max(130, Math.min(width - 130, width / 2 + Math.cos(angle) * radius)),
				top: Math.max(150, Math.min(height - 100, height / 2 + Math.sin(angle) * radius))
			}
		})
	}, [height, notes, width])

	if (maxSM) {
		return (
			<div className='min-h-screen px-4 pt-32 pb-28'>
				{loading && <p className='text-secondary py-20 text-center text-sm'>正在加载留言...</p>}
				{!loading && error && <p className='py-20 text-center text-sm text-red-500'>{error}</p>}
				{!loading && !error && notes.length === 0 && <p className='text-secondary py-20 text-center text-sm'>还没有公开留言，来写第一张便利贴吧。</p>}
				{!loading && !error && notes.length > 0 && <div className='mx-auto grid max-w-md gap-5'>{notes.map((note, index) => <StickyNote key={note.id} note={note} index={index} mobile />)}</div>}
			</div>
		)
	}

	return (
		<div className='relative min-h-screen overflow-hidden'>
			{loading && <p className='text-secondary absolute inset-0 flex items-center justify-center text-sm'>正在加载留言...</p>}
			{!loading && error && <p className='absolute inset-0 flex items-center justify-center text-sm text-red-500'>{error}</p>}
			{!loading && !error && notes.length === 0 && <p className='text-secondary absolute inset-0 flex items-center justify-center text-sm'>还没有公开留言，来写第一张便利贴吧。</p>}
			{!loading && !error && notes.map((note, index) => (
				<div key={note.id} className='absolute' style={{ left: positions[index]?.left, top: positions[index]?.top }}>
					<StickyNote note={note} index={index} />
				</div>
			))}
		</div>
	)
}
