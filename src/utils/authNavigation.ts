import { supabase } from '../lib/supabase';
import {
  hasCurrentUserAcceptedLatestLegal,
  hasUserAcceptedLatestLegal,
} from '../services/legalAcceptanceService';
import { logger } from './logger';

export const ROUTES = {
  landing: '/',
  auth: '/auth',
  onboardingBasic: '/onboarding/profile/basic',
  onboardingComplete: '/onboarding/profile/complete',
  legalConsent: '/onboarding/legal-consent',
  home: '/radar',
} as const;

type ProfileRecord = {
  display_name?: string | null;
  user_name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
} | null;

const hasBasicProfile = (profile: ProfileRecord) => Boolean(
  profile?.display_name &&
  profile?.user_name &&
  profile?.date_of_birth &&
  profile?.gender
);

const hasCompletedOnboarding = (socialLinksExist: boolean) => socialLinksExist;

const loadProfileContract = async (userId: string) => {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('display_name, user_name, date_of_birth, gender')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    logger.error('AuthNavigation', 'Failed to load profile for routing', profileError);
  }

  const { data: socialLinksData, error: socialLinksError } = await supabase
    .from('social_links')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (socialLinksError) {
    logger.error('AuthNavigation', 'Failed to load social links for routing', socialLinksError);
  }

  return {
    profile: profileData
      ? {
          display_name: profileData.display_name,
          user_name: profileData.user_name,
          date_of_birth: profileData.date_of_birth,
          gender: profileData.gender,
        }
      : null,
    socialLinksExist: Boolean(socialLinksData?.id),
  };
};

export const determinePostAuthRoute = async (options?: {
  userId?: string | null;
  profileOverride?: ProfileRecord;
}) => {
  try {
    let userId = options?.userId ?? null;

    if (!userId) {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        logger.error('AuthNavigation', 'Failed to fetch user for routing', error);
        return null;
      }
      userId = data.user?.id ?? null;
    }

    if (!userId) {
      logger.warn('AuthNavigation', 'No authenticated user available to determine route');
      return ROUTES.auth;
    }

    const legalAcceptanceResult = options?.userId
      ? await hasUserAcceptedLatestLegal(userId)
      : await hasCurrentUserAcceptedLatestLegal();
    const { accepted: hasLatestLegalAcceptance, error: legalError } = legalAcceptanceResult;
    if (legalError) {
      logger.error('AuthNavigation', 'Failed to resolve legal acceptance for routing', legalError);
    }
    if (!hasLatestLegalAcceptance) {
      return ROUTES.legalConsent;
    }

    let profile: ProfileRecord | null | undefined = options?.profileOverride;
    let socialLinksExist = false;
    if (typeof profile === 'undefined') {
      const contract = await loadProfileContract(userId);
      profile = contract.profile;
      socialLinksExist = contract.socialLinksExist;
    } else {
      const { data: socialLinksData, error: socialLinksError } = await supabase
        .from('social_links')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (socialLinksError) {
        logger.error('AuthNavigation', 'Failed to load social links for routing', socialLinksError);
      }

      socialLinksExist = Boolean(socialLinksData?.id);
    }

    if (!hasBasicProfile(profile)) {
      return ROUTES.onboardingBasic;
    }

    if (!hasCompletedOnboarding(socialLinksExist)) {
      return ROUTES.onboardingComplete;
    }

    return ROUTES.home;
  } catch (error) {
    logger.error('AuthNavigation', 'Unknown routing failure', error);
    return ROUTES.home;
  }
};

export const getPostLogoutRoute = () => ROUTES.auth;
