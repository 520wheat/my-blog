# Guestbook Wall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use sp-executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Replace the `/live2d` model page with a moderated sticky-note guestbook backed by Cloudflare D1.

**Architecture:** A public Next route writes validated pending notes to a D1 binding named `GUESTBOOK_DB`; the same route reads approved notes. Existing browser-side GitHub App authentication supplies a short-lived Installation Token for admin reads and approve/delete actions. The page reuses the photo wall's motion and stable-position ideas, while using a dedicated text-note component.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Cloudflare D1, OpenNext Cloudflare, Motion, lucide-react, Node's built-in `node:test`.

## Global Constraints

- Public notes are plain text only; no Markdown, HTML, images, avatars, or external links.
- New notes are `pending` until the site owner approves them.
- GitHub private keys are never sent to or stored by the guestbook API.
- The API must validate empty input, maximum lengths, allowed colors, and admin status transitions at the trust boundary.
- Do not add a new runtime dependency; use existing Motion, Sonner, Lucide, and Cloudflare APIs.
- Do not add an invalid D1 `database_id` to `wrangler.toml`; the real binding is added after the owner creates the D1 database.

---

### Task 1: Add Guestbook Domain Types and Validation

**Files:**
- Create: `src/lib/guestbook.ts`
- Create: `scripts/guestbook.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces `GuestbookNote`, `GuestbookStatus`, `GuestbookColor`, `GUESTBOOK_COLORS`, `MAX_NICKNAME_LENGTH`, `MAX_CONTENT_LENGTH`, and `validateGuestbookInput(input: unknown)`.
- `validateGuestbookInput` returns `{ ok: true, value: { nickname: string; content: string; color: GuestbookColor } }` or `{ ok: false; message: string }`.

- [ ] **Step 1: Write the failing validation test**

```ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateGuestbookInput } from '../src/lib/guestbook.ts'

test('trims a valid note before saving', () => {
	const result = validateGuestbookInput({ nickname: ' wheat ', content: ' hello ', color: '#fff3b0' })
	assert.deepEqual(result, { ok: true, value: { nickname: 'wheat', content: 'hello', color: '#fff3b0' } })
})

test('rejects blank, oversized, and unknown input', () => {
	assert.equal(validateGuestbookInput({ nickname: '', content: 'hello', color: '#fff3b0' }).ok, false)
	assert.equal(validateGuestbookInput({ nickname: 'a', content: 'x'.repeat(501), color: '#fff3b0' }).ok, false)
	assert.equal(validateGuestbookInput({ nickname: 'a', content: 'hello', color: 'red' }).ok, false)
})
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `node --experimental-strip-types --test scripts/guestbook.test.ts`

Expected: FAIL because `src/lib/guestbook.ts` does not exist yet.

- [ ] **Step 3: Implement the minimum validation module**

```ts
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

export function validateGuestbookInput(input: unknown) {
	if (!input || typeof input !== 'object') return { ok: false as const, message: '留言格式不正确' }
	const value = input as Record<string, unknown>
	const nickname = typeof value.nickname === 'string' ? value.nickname.trim() : ''
	const content = typeof value.content === 'string' ? value.content.trim() : ''
	const color = value.color
	if (!nickname || nickname.length > MAX_NICKNAME_LENGTH) return { ok: false as const, message: '昵称不能为空且不能超过 24 个字' }
	if (!content || content.length > MAX_CONTENT_LENGTH) return { ok: false as const, message: '留言不能为空且不能超过 500 个字' }
	if (!GUESTBOOK_COLORS.includes(color as GuestbookColor)) return { ok: false as const, message: '便签颜色不正确' }
	return { ok: true as const, value: { nickname, content, color: color as GuestbookColor } }
}
```

- [ ] **Step 4: Add the test script and verify it passes**

Add `"test:guestbook": "node --experimental-strip-types --test scripts/guestbook.test.ts"` to `package.json`, then run: `pnpm test:guestbook`.

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/guestbook.ts scripts/guestbook.test.ts package.json
git commit -m "feat: add guestbook validation"
```

### Task 2: Add D1 Migration and Guestbook API

**Files:**
- Create: `migrations/0001_guestbook.sql`
- Create: `src/lib/guestbook-server.ts`
- Create: `src/app/api/guestbook/route.ts`
- Create: `src/app/api/guestbook/[id]/route.ts`
- Modify: `global.d.ts`

**Interfaces:**
- `GET /api/guestbook` returns `{ notes: GuestbookNote[] }` for approved notes.
- `POST /api/guestbook` accepts `{ nickname, content, color }` and returns `201` with `{ note: GuestbookNote }` when a pending note is created.
- `GET /api/guestbook?admin=1` returns pending and approved notes only after GitHub repository access validation.
- `PATCH /api/guestbook/:id` accepts `{ action: 'approve' | 'delete' }` and requires the same admin validation.

- [ ] **Step 1: Write the D1 migration**

```sql
CREATE TABLE IF NOT EXISTS guestbook_notes (
	id TEXT PRIMARY KEY,
	nickname TEXT NOT NULL,
	content TEXT NOT NULL,
	color TEXT NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'deleted')),
	created_at TEXT NOT NULL,
	approved_at TEXT
);

CREATE INDEX IF NOT EXISTS guestbook_notes_status_created_at
	ON guestbook_notes (status, created_at DESC);
```

- [ ] **Step 2: Implement server helpers**

Use `getCloudflareContext({ async: true })` to read the optional `GUESTBOOK_DB` binding. Return a `503` configuration response when the binding is absent. Use parameterized D1 statements for all values. For duplicate protection, reject the same nickname/content pair if it was submitted within the last 10 minutes.

Validate admin requests by extracting `Authorization: Bearer <installation-token>` and calling GitHub's configured repository endpoint with that token. Return false for missing, expired, or unauthorized tokens; never log the token.

- [ ] **Step 3: Implement public and admin collection handlers**

`GET` must filter with `WHERE status = 'approved'` for public requests. `GET` with `admin=1` must require admin validation and query only `pending` and `approved`. `POST` must call `validateGuestbookInput`, generate `crypto.randomUUID()`, insert `pending`, and return the inserted note without exposing internal data.

- [ ] **Step 4: Implement approve/delete handler**

Require admin validation, accept only `approve` and `delete`, reject unknown IDs with `404`, set `approved_at` only for `approve`, and prevent changing a deleted note back to approved.

- [ ] **Step 5: Run type/build verification**

Run: `pnpm exec tsc --noEmit` and `pnpm test:guestbook`.

Expected: no new type errors and all validation tests pass. The API is not expected to work locally until a D1 binding is configured.

- [ ] **Step 6: Commit**

```bash
git add migrations src/lib/guestbook-server.ts src/app/api/guestbook global.d.ts
git commit -m "feat: add moderated guestbook API"
```

### Task 3: Add Browser API Client and Guestbook UI

**Files:**
- Create: `src/app/live2d/services/guestbook-api.ts`
- Create: `src/app/live2d/components/guestbook-wall.tsx`
- Create: `src/app/live2d/components/guestbook-form.tsx`
- Create: `src/app/live2d/components/guestbook-admin.tsx`
- Modify: `src/app/live2d/page.tsx`

**Interfaces:**
- `guestbook-api.ts` exposes typed `fetchNotes`, `submitNote`, `fetchAdminNotes`, and `moderateNote` functions.
- `GuestbookWall` renders approved notes and accepts `notes: GuestbookNote[]`.
- `GuestbookForm` submits through `submitNote` and preserves fields when the request fails.
- `GuestbookAdmin` uses the existing `useAuthStore`/`getAuthToken` flow and calls `moderateNote` for approve/delete.

- [ ] **Step 1: Add the typed API client**

Use `fetch('/api/guestbook')`, JSON responses, and throw the server's `error` message for non-2xx responses. Send the Installation Token only in the `Authorization` header for admin calls.

- [ ] **Step 2: Add the page shell and run the first build check**

Create the page shell that imports the new components, then run `pnpm build:cf`. Resolve only missing exports or incomplete props required by the page before adding visual behavior.

- [ ] **Step 3: Implement the wall**

Use a stable string hash of note ID for desktop position and rotation, Motion drag behavior, the existing `useCenterInit`/`useCenterStore`, and note colors from the validated data. On small screens render notes in a two-column responsive grid so text remains readable and notes do not overlap.

- [ ] **Step 4: Implement form and submission states**

Provide nickname, content, and color controls. Disable submit while saving, show success text that the note is waiting for approval, and show server errors without clearing input.

- [ ] **Step 5: Implement admin controls**

Show a compact management control. If unauthenticated, reuse the hidden `.pem` file picker pattern from the pictures page. After authentication, show pending notes with approve/delete actions and refresh after every mutation. Clear auth and ask for the key again when the API returns `401`.

- [ ] **Step 6: Verify the UI build**

Run: `pnpm build:cf`.

Expected: exit code 0, `/live2d` remains in the route list, and no new TypeScript/build errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/live2d src/app/api/guestbook
git commit -m "feat: replace live2d with guestbook wall"
```

### Task 4: Remove the Live2D Runtime and Document Cloudflare Setup

**Files:**
- Delete: `src/app/live2d/live2d-viewer.tsx`
- Delete: `public/live2d/**`
- Modify: `README.md`

- [ ] **Step 1: Remove unused Live2D code and assets**

Delete the viewer and model files after the new page no longer imports them. Confirm with `rg -n "live2d|Live2D|PIXI|cubism" src public` that no runtime or model reference remains; the route name `/live2d` itself is allowed.

- [ ] **Step 2: Add exact Cloudflare setup instructions**

Document these commands after the owner runs `wrangler login` and creates the database:

```bash
pnpm exec wrangler d1 create 2025-blog-guestbook
pnpm exec wrangler d1 execute 2025-blog-guestbook --remote --file=migrations/0001_guestbook.sql
```

Document the required `wrangler.toml` entry with the returned database ID:

```toml
[[d1_databases]]
binding = "GUESTBOOK_DB"
database_name = "2025-blog-guestbook"
database_id = "paste the UUID printed by wrangler d1 create"
```

The actual ID is intentionally not committed before the owner creates the database.

- [ ] **Step 3: Run final residual-reference checks**

Run:

```bash
rg -n "PIXI|cubism|live2d\.model3|live2d-viewer" src public || true
rg -n "GUESTBOOK_DB|guestbook_notes|/api/guestbook" src migrations wrangler.toml README.md
```

Expected: only the route name and guestbook implementation references remain; D1 references are present.

- [ ] **Step 4: Commit**

```bash
git add README.md src/app/live2d public/live2d
git commit -m "chore: remove live2d assets and document d1 setup"
```

### Task 5: Final Verification and Handoff

**Files:**
- Modify: only files implicated by a failed verification command.

- [ ] **Step 1: Run the focused test**

Run: `pnpm test:guestbook`.

Expected: all tests pass.

- [ ] **Step 2: Run the Cloudflare build**

Run: `pnpm run build:cf`.

Expected: exit code 0, with only the existing non-blocking Next/OpenNext warnings if they occur.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff HEAD~4 --stat`, `git diff --check`, and `git status --short`.

Expected: only guestbook, D1, Live2D replacement, and documentation changes are present; no PEM or generated build output is staged.

- [ ] **Step 4: Commit any verification fix and report the Cloudflare prerequisite**

If a verification fix is needed, commit it with `fix: verify guestbook wall`. Report that deployment remains pending until the D1 database is created, bound as `GUESTBOOK_DB`, migrated, and the resulting commit is pushed.
