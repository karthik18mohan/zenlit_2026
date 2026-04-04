import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sheetSource = fs.readFileSync('src/components/VisibilitySheet.tsx', 'utf8');

const contextSource = fs.readFileSync('src/contexts/VisibilityContext.tsx', 'utf8');

test('rationale modal is shown before permission request is triggered', () => {
  assert.match(sheetSource, /setShowLocationRationale\(true\)/);
  assert.match(sheetSource, /const handleContinueToSystemPrompt[\s\S]*requestLocationPermission\(\{ autoEnable: true \}\)/);
});

test('denied and blocked states have dedicated recovery UI copy', () => {
  assert.match(sheetSource, /locationStatus === 'permission-denied'/);
  assert.match(sheetSource, /Location permission was denied/);
  assert.match(sheetSource, /Try again/);

  assert.match(sheetSource, /locationStatus === 'permission-blocked'/);
  assert.match(sheetSource, /Location permission is blocked/);
  assert.match(sheetSource, /Open settings/);
});

test('settings deep link path exists for blocked and disabled states', () => {
  assert.match(sheetSource, /Linking\.openSettings\(\)/);
  assert.match(sheetSource, /locationStatus === 'services-disabled'/);
  assert.match(contextSource, /'services-disabled'/);
  assert.match(contextSource, /'permission-blocked'/);
});
