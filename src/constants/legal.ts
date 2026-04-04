import Constants from 'expo-constants';

type ExtraConfig = {
  webBaseUrl?: string;
  supportEmail?: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
  accountDeletionUrl?: string;
};

const normalize = (value?: string): string | undefined => {
  if (!value || typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim().replace(/\/$/, '');
  if (!trimmed.length) {
    return undefined;
  }

  return trimmed;
};

const resolveExtra = (): ExtraConfig => (Constants.expoConfig?.extra as ExtraConfig) ?? {};

const resolveBaseUrl = (): string => {
  const envUrl = normalize(process.env.EXPO_PUBLIC_WEB_BASE_URL);
  if (envUrl) {
    return envUrl;
  }

  const extraUrl = normalize(resolveExtra().webBaseUrl);
  if (extraUrl) {
    return extraUrl;
  }

  return 'https://zenlit.app';
};

const resolveSupportEmail = (): string => {
  const envEmail = normalize(process.env.EXPO_PUBLIC_SUPPORT_EMAIL);
  if (envEmail) {
    return envEmail;
  }

  const extraEmail = normalize(resolveExtra().supportEmail);
  if (extraEmail) {
    return extraEmail;
  }

  return 'support@zenlit.app';
};

const resolveUrl = (envValue: string | undefined, extraValue: string | undefined, fallbackPath: string): string => {
  return normalize(envValue) ?? normalize(extraValue) ?? `${WEB_BASE_URL}${fallbackPath}`;
};

export const LEGAL_VERSION = 'v1.0';
export const TERMS_VERSION = LEGAL_VERSION;
export const PRIVACY_VERSION = LEGAL_VERSION;
export const LEGAL_EFFECTIVE_DATE = 'April 3, 2026';
export const LEGAL_LAST_UPDATED = 'April 3, 2026';

export const SUPPORT_EMAIL = resolveSupportEmail();
export const WEB_BASE_URL = resolveBaseUrl();

export const PRIVACY_POLICY_URL = resolveUrl(
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL,
  resolveExtra().privacyPolicyUrl,
  '/privacy'
);

export const TERMS_URL = resolveUrl(
  process.env.EXPO_PUBLIC_TERMS_URL,
  resolveExtra().termsUrl,
  '/terms'
);

export const ACCOUNT_DELETION_URL = resolveUrl(
  process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL,
  resolveExtra().accountDeletionUrl,
  '/delete-account'
);

export const LEGAL_URLS = {
  privacy: PRIVACY_POLICY_URL,
  terms: TERMS_URL,
  accountDeletion: ACCOUNT_DELETION_URL,
} as const;
