'use client'

import { useEffect, useId, useState } from 'react'

type MermaidApi = typeof import('mermaid').default

type MermaidDiagramProps = {
	chart: string
}

let mermaidPromise: Promise<MermaidApi> | null = null

function loadMermaid(): Promise<MermaidApi> {
	if (!mermaidPromise) {
		mermaidPromise = import('mermaid').then(module => module.default)
	}
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
