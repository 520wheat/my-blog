import assert from 'node:assert/strict'
import { test } from 'node:test'
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
