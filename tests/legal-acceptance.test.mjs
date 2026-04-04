import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const authScreenSource = fs.readFileSync('app/auth/index.tsx', 'utf8');
const legalConsentSource = fs.readFileSync('app/onboarding/legal-consent.tsx', 'utf8');
const legalServiceSource = fs.readFileSync('src/services/legalAcceptanceService.ts', 'utf8');

const canSubmitSignup = ({ isValidEmail, emailLoading }) => {
  return isValidEmail && !emailLoading;
};

const hasLatestLegalVersions = (record, versions) => {
  if (!record) {
    return false;
  }

  return (
    record.terms_version === versions.terms &&
    record.privacy_version === versions.privacy &&
    Boolean(record.accepted_at)
  );
};

test('signup no longer depends on a duplicate legal checkbox gate before OTP send', () => {
  assert.equal(
    canSubmitSignup({ isValidEmail: true, emailLoading: false }),
    true,
  );
  assert.doesNotMatch(authScreenSource, /accessibilityRole="checkbox"/);
  assert.doesNotMatch(authScreenSource, /hasAcceptedLegal/);
  assert.match(
    authScreenSource,
    /You will review and accept the current Terms of Service and Privacy Policy on the next step before app access is granted\./,
  );
});

test('legal consent screen includes explicit terms and privacy links', () => {
  assert.match(legalConsentSource, /Terms of Service/);
  assert.match(legalConsentSource, /Privacy Policy/);
  assert.match(legalConsentSource, /Linking\.openURL\(LEGAL_URLS\.terms\)/);
  assert.match(legalConsentSource, /Linking\.openURL\(LEGAL_URLS\.privacy\)/);
});

test('acceptance persistence writes user, versions, and acceptance timestamp to legal_acceptances', () => {
  assert.match(legalServiceSource, /from\('legal_acceptances'\)/);
  assert.match(legalServiceSource, /user_id:\s*user\.id/);
  assert.match(legalServiceSource, /terms_version:\s*TERMS_VERSION/);
  assert.match(legalServiceSource, /privacy_version:\s*PRIVACY_VERSION/);
  assert.match(legalServiceSource, /accepted_at:\s*nowIso/);
});

test('acceptance validity requires matching terms/privacy versions and timestamp', () => {
  const versions = { terms: 'v1.0', privacy: 'v1.0' };

  assert.equal(
    hasLatestLegalVersions(
      { terms_version: 'v1.0', privacy_version: 'v1.0', accepted_at: '2026-04-03T12:00:00.000Z' },
      versions,
    ),
    true,
  );

  assert.equal(
    hasLatestLegalVersions(
      { terms_version: 'v0.9', privacy_version: 'v1.0', accepted_at: '2026-04-03T12:00:00.000Z' },
      versions,
    ),
    false,
  );
});
