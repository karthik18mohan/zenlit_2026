import fs from 'node:fs';

const checks = [
  {
    file: 'app/privacy.tsx',
    forbidden: [/email support to request deletion/i, /contact support to delete/i, /manual deletion request/i],
  },
  {
    file: 'app/terms.tsx',
    forbidden: [/email support to request deletion/i, /contact support to delete/i, /manual deletion request/i],
  },
  {
    file: 'app/delete-account.tsx',
    required: [/Permanently delete account/, /Verification code sent\./, /Identity verified\./],
  },
  {
    file: 'src/components/VisibilitySheet.tsx',
    required: [/Enable location for Radar\?/, /foreground location/, /Not now/],
  },
];

let failures = 0;

for (const check of checks) {
  const source = fs.readFileSync(check.file, 'utf8');

  for (const pattern of check.forbidden ?? []) {
    if (pattern.test(source)) {
      console.error(`[FAIL] ${check.file}: contains forbidden pattern ${pattern}`);
      failures += 1;
    }
  }

  for (const pattern of check.required ?? []) {
    if (!pattern.test(source)) {
      console.error(`[FAIL] ${check.file}: missing required pattern ${pattern}`);
      failures += 1;
    }
  }
}

if (failures > 0) {
  console.error(`Compliance lint failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('Compliance lint passed.');
