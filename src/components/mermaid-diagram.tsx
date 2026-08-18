'use client'

import { useEffect, useId, useState } from 'react'

const MERMAID_CDN_URL = 'https://cdn.jsdelivr.net/npm/mermaid@11.16.1/dist/mermaid.min.js'

type MermaidApi = {
	initialize(config: { startOnLoad: boolean; securityLevel: 'strict'; theme: 'base' }): void
	render(id: string, chart: string): Promise<{ svg: string }>
}

declare global {
	interface Window {
		mermaid?: MermaidApi
	}
}

type MermaidDiagramProps = {
	chart: string
}

let mermaidPromise: Promise<MermaidApi> | null = null

function loadMermaid(): Promise<MermaidApi> {
	if (typeof window === 'undefined') return Promise.reject(new Error('Mermaid 只能在浏览器中加载'))
	if (window.mermaid) return Promise.resolve(window.mermaid)
	if (mermaidPromise) return mermaidPromise

	mermaidPromise = new Promise((resolve, reject) => {
		const script = document.createElement('script')
		script.src = MERMAID_CDN_URL
		script.async = true
		script.crossOrigin = 'anonymous'
		script.onload = () => {
			if (window.mermaid) {
				resolve(window.mermaid)
			} else {
				reject(new Error('Mermaid CDN 加载完成但未找到运行时'))
			}
		}
		script.onerror = () => reject(new Error('Mermaid CDN 加载失败'))
		document.head.appendChild(script)
	})

	return mermaidPromise
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
	const rawId = useId()
	const renderId = `mermaid-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
	const [svg, setSvg] = useState<string | null>(null)
	const [hasError, setHasError] = useState(false)

	useEffect(() => {
		let cancelled = false
		setSvg(null)
		setHasError(false)

		async function render() {
			try {
				const mermaid = await loadMermaid()
				mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base' })
				const result = await mermaid.render(renderId, chart)

				if (!cancelled) setSvg(result.svg)
			} catch (error) {
				console.error('Mermaid render error:', error)
				if (!cancelled) setHasError(true)
			}
		}

		render()
		return () => {
			cancelled = true
		}
	}, [chart, renderId])

	if (hasError) {
		return (
			<div className='mermaid-error'>
				<p>Mermaid 图表渲染失败，请检查语法</p>
				<pre className='mermaid-fallback'>
					<code>{chart}</code>
				</pre>
			</div>
		)
	}

	if (!svg) {
		return <div className='mermaid-diagram' aria-busy='true' aria-label='Mermaid 图表加载中' />
	}

	return <div className='mermaid-diagram' dangerouslySetInnerHTML={{ __html: svg }} />
}
