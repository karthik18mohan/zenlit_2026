import test from 'node:test';
import assert from 'node:assert/strict';

const isValidDeletePhrase = (value) => value.trim().toUpperCase() === 'DELETE';
const sanitizeOtp = (value) => value.replace(/[^0-9]/g, '').slice(0, 6);
const isValidEmailAddress = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

test('delete phrase must strictly equal DELETE (case-insensitive, trimmed)', () => {
  assert.equal(isValidDeletePhrase('DELETE'), true);
  assert.equal(isValidDeletePhrase(' delete '), true);
  assert.equal(isValidDeletePhrase('DELETE NOW'), false);
});

test('sanitizeOtp strips non-digits and limits to 6 chars', () => {
  assert.equal(sanitizeOtp('1a2b3c4d5e6f7'), '123456');
  assert.equal(sanitizeOtp('009999'), '009999');
});

test('email validator rejects malformed input', () => {
  assert.equal(isValidEmailAddress('hello@example.com'), true);
  assert.equal(isValidEmailAddress('hello@'), false);
  assert.equal(isValidEmailAddress('helloexample.com'), false);
});
