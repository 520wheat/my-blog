import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeBlogSlug } from '../src/lib/blog-slug.ts'
import { GITHUB_CONFIG } from '../src/consts.ts'
import { canTransitionGuestbookStatus, validateGuestbookInput } from '../src/lib/guestbook.ts'

test('trims a valid note before saving', () => {
	const result = validateGuestbookInput({ nickname: ' wheat ', content: ' hello ', color: '#fff3b0' })
	assert.deepEqual(result, { ok: true, value: { nickname: 'wheat', content: 'hello', color: '#fff3b0' } })
})

test('rejects blank, oversized, and unknown input', () => {
	assert.equal(validateGuestbookInput({ nickname: '', content: 'hello', color: '#fff3b0' }).ok, false)
	assert.equal(validateGuestbookInput({ nickname: 'a', content: 'x'.repeat(501), color: '#fff3b0' }).ok, false)
	assert.equal(validateGuestbookInput({ nickname: 'a', content: 'hello', color: 'red' }).ok, false)
})

test('does not restore a deleted note', () => {
	assert.equal(canTransitionGuestbookStatus('pending', 'approved'), true)
	assert.equal(canTransitionGuestbookStatus('approved', 'deleted'), true)
	assert.equal(canTransitionGuestbookStatus('deleted', 'approved'), false)
})

test('uses the fork GitHub App defaults for server-side auth', () => {
	assert.equal(GITHUB_CONFIG.OWNER, '520wheat')
	assert.equal(GITHUB_CONFIG.REPO, 'my-blog')
	assert.equal(GITHUB_CONFIG.APP_ID, '4596326')
})

test('normalizes encoded blog route slugs before loading files', () => {
	assert.equal(normalizeBlogSlug('子代理流水线'), '子代理流水线')
	assert.equal(normalizeBlogSlug('%E5%AD%90%E4%BB%A3%E7%90%86%E6%B5%81%E6%B0%B4%E7%BA%BF'), '子代理流水线')
})
