import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const profileMenuSheetSource = fs.readFileSync('src/components/profile/ProfileMenuSheet.tsx', 'utf8');
const profileScreenSource = fs.readFileSync('app/profile/index.tsx', 'utf8');
const profileLegalScreenSource = fs.readFileSync('app/profile/legal.tsx', 'utf8');

test('profile menu routes to dedicated legal hub instead of ambiguous privacy-only action', () => {
  assert.match(profileMenuSheetSource, /<Text style=\{styles\.rowLabel\}>Legal<\/Text>/);
  assert.doesNotMatch(profileMenuSheetSource, /Privacy\s*&\s*Terms/);
  assert.match(profileMenuSheetSource, /onLegalHub/);

  assert.match(profileScreenSource, /router\.push\('\/profile\/legal'\)/);
  assert.doesNotMatch(profileScreenSource, /Linking\.openURL\(LEGAL_URLS\.privacy\)/);
});

test('legal hub exposes privacy, terms, and account deletion entries with configured destinations', () => {
  assert.match(profileLegalScreenSource, /label:\s*'Privacy Policy'/);
  assert.match(profileLegalScreenSource, /label:\s*'Terms of Service'/);
  assert.match(profileLegalScreenSource, /label:\s*'Account Deletion Information'/);

  assert.match(profileLegalScreenSource, /destination:\s*LEGAL_URLS\.privacy/);
  assert.match(profileLegalScreenSource, /destination:\s*LEGAL_URLS\.terms/);
  assert.match(profileLegalScreenSource, /destination:\s*LEGAL_URLS\.accountDeletion/);

  assert.match(profileLegalScreenSource, /onPress=\{\(\) => openDestination\(entry\.destination\)\}/);
  assert.match(profileLegalScreenSource, /Linking\.openURL\(destination\)/);
});
