import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export type DeleteAccountResult = {
  success: boolean;
  warnings: string[];
  requiresReauth?: boolean;
  error?: string;
};

const DELETE_FUNCTION_NAME = 'delete-account';

export const requestDeletionOtp = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to send verification code' };
  }
};

export const verifyDeletionOtp = async (
  email: string,
  token: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to verify code' };
  }
};

export const deleteCurrentAccount = async (): Promise<DeleteAccountResult> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return { success: false, warnings: [], requiresReauth: true, error: 'No active session found' };
    }

    const { data, error } = await supabase.functions.invoke(DELETE_FUNCTION_NAME, {
      body: { reason: 'user_initiated' },
    });

    if (error) {
      logger.error('AccountDeletion', 'delete-account invoke error', error);
      const message = error.message || 'Account deletion failed';
      return {
        success: false,
        warnings: [],
        requiresReauth: /401|unauthorized|jwt|expired|reauth/i.test(message),
        error: message,
      };
    }

    const warnings = Array.isArray(data?.warnings)
      ? data.warnings.filter((warning: unknown): warning is string => typeof warning === 'string')
      : [];

    if (!data?.success) {
      return {
        success: false,
        warnings,
        requiresReauth: Boolean(data?.requiresReauth),
        error: data?.error || 'Account deletion failed',
      };
    }

    return { success: true, warnings };
  } catch (error: any) {
    logger.error('AccountDeletion', 'deleteCurrentAccount exception', error);
    return {
      success: false,
      warnings: [],
      error: error?.message || 'Unknown deletion error',
      requiresReauth: /401|jwt|token|auth/i.test(error?.message || ''),
    };
  }
};

export const clearLocalUserData = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    logger.warn('AccountDeletion', 'Failed to clear async storage during account deletion', error);
  }
};
