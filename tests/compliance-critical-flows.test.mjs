import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const authNavigationSource = fs.readFileSync('src/utils/authNavigation.ts', 'utf8');
const deleteAccountPageSource = fs.readFileSync('app/delete-account.tsx', 'utf8');
const rootLayoutSource = fs.readFileSync('app/_layout.tsx', 'utf8');

test('post-auth routing enforces legal re-acceptance before onboarding/profile checks', () => {
  const legalCheckIndex = authNavigationSource.indexOf('hasCurrentUserAcceptedLatestLegal');
  const profileCheckIndex = authNavigationSource.indexOf("from('profiles')");

  assert.ok(legalCheckIndex >= 0, 'expected legal acceptance check in auth routing');
  assert.ok(profileCheckIndex >= 0, 'expected profile query in auth routing');
  assert.ok(
    legalCheckIndex < profileCheckIndex,
    'legal acceptance gate must happen before profile onboarding route logic',
  );
});

test('web account deletion requires OTP verification before final destructive action', () => {
  assert.match(deleteAccountPageSource, /const \[isVerified, setIsVerified\] = useState\(false\);/);
  assert.match(deleteAccountPageSource, /if \(!isVerified \|\| !canDelete \|\| deleting\) \{/);
  assert.match(deleteAccountPageSource, /disabled=\{!isVerified \|\| !canDelete \|\| deleting\}/);
});


test('root layout blocks authenticated users from app routes until legal consent is completed', () => {
  assert.match(rootLayoutSource, /if \(!hasAcceptedLegal && !onLegalConsent && !isPublicDeletePage\)/);
  assert.match(rootLayoutSource, /router\.replace\(ROUTES\.legalConsent\)/);
});
