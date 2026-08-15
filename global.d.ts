declare module '*.svg' {
	export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>
	export default ReactComponent
}
declare module '*.svg?url' {
	const content: StaticImageData

	export default content
}

declare type NullableNumber = string | number | null
declare type NullableObject = Record<string, any> | null
declare type NullableArray = Record<string, any>[] | null
declare type Nullable<T> = T | null

interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement
	first<T = unknown>(): Promise<T | null>
	all<T = unknown>(): Promise<{ results?: T[] }>
	run(): Promise<unknown>
}

interface D1Database {
	prepare(query: string): D1PreparedStatement
}

interface CloudflareEnv {
	GUESTBOOK_DB?: D1Database
}
