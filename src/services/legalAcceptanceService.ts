import { supabase } from '../lib/supabase';
import { PRIVACY_VERSION, TERMS_VERSION } from '../constants/legal';
import { logger } from '../utils/logger';

export type LegalAcceptanceRecord = {
  user_id: string;
  terms_version: string;
  privacy_version: string;
  accepted_at: string;
  created_at?: string;
  updated_at?: string;
};

const hasLatestAcceptedVersions = (acceptance: LegalAcceptanceRecord | null) =>
  Boolean(
    acceptance &&
    acceptance.terms_version === TERMS_VERSION &&
    acceptance.privacy_version === PRIVACY_VERSION &&
    acceptance.accepted_at,
  );

export const getUserLegalAcceptance = async (
  userId: string,
): Promise<{ acceptance: LegalAcceptanceRecord | null; error: Error | null }> => {
  try {
    if (!userId) {
      return { acceptance: null, error: new Error('User id is required') };
    }

    const { data, error } = await supabase
      .from('legal_acceptances')
      .select('user_id, terms_version, privacy_version, accepted_at, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { acceptance: null, error };
    }

    return { acceptance: data as LegalAcceptanceRecord | null, error: null };
  } catch (error) {
    return { acceptance: null, error: error as Error };
  }
};

export const getCurrentUserLegalAcceptance = async (): Promise<{ acceptance: LegalAcceptanceRecord | null; error: Error | null }> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { acceptance: null, error: userError ?? new Error('Not authenticated') };
    }

    return getUserLegalAcceptance(user.id);
  } catch (error) {
    return { acceptance: null, error: error as Error };
  }
};

export const hasUserAcceptedLatestLegal = async (
  userId: string,
): Promise<{ accepted: boolean; error: Error | null }> => {
  const { acceptance, error } = await getUserLegalAcceptance(userId);

  if (error) {
    logger.error('LegalAcceptance', 'Failed to load legal acceptance', error);
    return { accepted: false, error };
  }

  return { accepted: hasLatestAcceptedVersions(acceptance), error: null };
};

export const hasCurrentUserAcceptedLatestLegal = async (): Promise<{ accepted: boolean; error: Error | null }> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { accepted: false, error: userError ?? new Error('Not authenticated') };
    }

    return hasUserAcceptedLatestLegal(user.id);
  } catch (error) {
    logger.error('LegalAcceptance', 'Failed to resolve current user for legal acceptance', error);
    return { accepted: false, error: error as Error };
  }
};

export const saveCurrentUserLegalAcceptance = async (): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: userError ?? new Error('Not authenticated') };
    }

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('legal_acceptances')
      .upsert({
        user_id: user.id,
        terms_version: TERMS_VERSION,
        privacy_version: PRIVACY_VERSION,
        accepted_at: nowIso,
        updated_at: nowIso,
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};
