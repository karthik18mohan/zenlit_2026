import test from 'node:test';
import assert from 'node:assert/strict';

const parseDeleteResult = (data, errorMessage = '') => {
  if (errorMessage) {
    return {
      success: false,
      requiresReauth: /401|unauthorized|jwt|expired|reauth/i.test(errorMessage),
    };
  }

  if (!data?.success) {
    return {
      success: false,
      requiresReauth: Boolean(data?.requiresReauth),
      warnings: Array.isArray(data?.warnings) ? data.warnings : [],
    };
  }

  return {
    success: true,
    warnings: Array.isArray(data?.warnings) ? data.warnings : [],
  };
};

test('maps auth errors to reauth-required state', () => {
  const result = parseDeleteResult(null, '401 Unauthorized: JWT expired');
  assert.equal(result.success, false);
  assert.equal(result.requiresReauth, true);
});

test('preserves warning payloads from backend', () => {
  const result = parseDeleteResult({ success: true, warnings: ['storage warning'] });
  assert.equal(result.success, true);
  assert.deepEqual(result.warnings, ['storage warning']);
});
