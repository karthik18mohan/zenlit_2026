import { supabase } from '../lib/supabase';
import { logger } from './logger';

export interface ProfileData {
  display_name: string;
  user_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface UsernameCheckResult {
  isAvailable: boolean;
  suggestions?: string[];
}

export const VALID_GENDERS = ['male', 'female', 'other'] as const;

const isMissingRpcError = (error: unknown): boolean => {
  const message = typeof (error as { message?: unknown })?.message === 'string'
    ? String((error as { message: string }).message)
    : '';

  return /Could not find the function|schema cache|PGRST202|PGRST204/i.test(message);
};

export const normalizeGender = (value: string): 'male' | 'female' | 'other' => {
  const v = value.trim().toLowerCase();
  if (v.startsWith('male')) return 'male';
  if (v.startsWith('female')) return 'female';
  return 'other';
};

export const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const parseDobString = (value: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const da = Number(m[3]);
  const dt = new Date(y, mo, da);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== da) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
};

/**
 * Validates username format - only lowercase letters, numbers, dots, underscores, and special characters
 */
export const validateUsername = (username: string): ValidationResult => {
  if (!username) {
    return { isValid: false, error: 'Username is required' };
  }

  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }

  if (username.length > 30) {
    return { isValid: false, error: 'Username must be less than 30 characters' };
  }

  // Only allow safe characters: lowercase letters, numbers, dots, underscores, hyphens
  const validUsernameRegex = /^[a-z0-9._-]+$/;

  if (!validUsernameRegex.test(username)) {
    return {
      isValid: false,
      error: 'Username can only contain lowercase letters, numbers, dots, underscores, and hyphens'
    };
  }

  return { isValid: true };
};

/**
 * Validates display name
 */
export const validateDisplayName = (displayName: string): ValidationResult => {
  if (!displayName) {
    return { isValid: false, error: 'Display name is required' };
  }

  if (displayName.length < 2) {
    return { isValid: false, error: 'Display name must be at least 2 characters long' };
  }

  if (displayName.length > 50) {
    return { isValid: false, error: 'Display name must be less than 50 characters' };
  }

  return { isValid: true };
};

/**
 * Validates date of birth
 */
export const validateDateOfBirth = (dateOfBirth: string): ValidationResult => {
  if (!dateOfBirth) {
    return { isValid: false, error: 'Date of birth is required' };
  }

  const date = new Date(dateOfBirth);
  const today = new Date();
  const minAge = new Date();
  minAge.setFullYear(today.getFullYear() - 13);

  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Please enter a valid date' };
  }

  if (date > today) {
    return { isValid: false, error: 'Date of birth cannot be in the future' };
  }

  if (date > minAge) {
    return { isValid: false, error: 'You must be at least 13 years old' };
  }

  return { isValid: true };
};

/**
 * Checks if username is available and provides suggestions if not
 */
export const checkUsernameAvailability = async (username: string): Promise<UsernameCheckResult> => {
  const normalizedUsername = username.trim().toLowerCase();

  try {
    const { data, error } = await supabase.rpc('check_username_available', {
      username_to_check: normalizedUsername,
    });

    if (error) {
      if (!isMissingRpcError(error)) {
        throw error;
      }
    } else if (typeof data === 'boolean') {
      if (data) {
        return { isAvailable: true };
      }

      const suggestions = await generateUsernameSuggestions(normalizedUsername);
      return { isAvailable: false, suggestions };
    }

    const { data: existingProfile, error: fallbackError } = await supabase
      .from('profiles')
      .select('user_name')
      .eq('user_name', normalizedUsername)
      .maybeSingle();

    if (fallbackError) {
      throw fallbackError;
    }

    if (!existingProfile) {
      // No rows found, username is available
      return { isAvailable: true };
    }

    // Username is taken, generate suggestions
    const suggestions = await generateUsernameSuggestions(normalizedUsername);
    return { isAvailable: false, suggestions };
  } catch (error) {
    logger.error('ProfileValidation', 'Error checking username availability', error);
    throw new Error('Failed to check username availability');
  }
};

/**
 * Generates username suggestions when the desired username is taken
 */
export const generateUsernameSuggestions = async (baseUsername: string): Promise<string[]> => {
  const normalizedBase = baseUsername.trim().toLowerCase();

  try {
    const { data, error } = await supabase.rpc('generate_username_suggestions', {
      base_username: normalizedBase,
      max_suggestions: 5,
    });

    if (error) {
      if (!isMissingRpcError(error)) {
        throw error;
      }
    } else if (Array.isArray(data)) {
      return data.filter((value): value is string => typeof value === 'string');
    }
  } catch (error) {
    if (!isMissingRpcError(error)) {
      logger.warn('ProfileValidation', 'Falling back to local username suggestion generation', error);
    }
  }

  const suggestions: string[] = [];
  const maxSuggestions = 5;
  const maxAttempts = 15;

  // Generate different types of suggestions
  const suggestionTypes = [
    () => `${normalizedBase}${Math.floor(Math.random() * 999) + 1}`,
    () => `${normalizedBase}_${Math.floor(Math.random() * 99) + 1}`,
    () => `${normalizedBase}.${Math.floor(Math.random() * 99) + 1}`,
    () => `${normalizedBase}${new Date().getFullYear()}`,
    () => `${normalizedBase}_user`,
    () => `${normalizedBase}${Math.floor(Math.random() * 9999) + 100}`,
  ];

  for (let i = 0; i < maxAttempts && suggestions.length < maxSuggestions; i++) {
    const suggestion = suggestionTypes[i % suggestionTypes.length]();

    if (suggestions.includes(suggestion)) {
      continue;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_name')
        .eq('user_name', suggestion)
        .maybeSingle();

      if (error) {
        continue;
      }

      if (!data) {
        suggestions.push(suggestion);
      }
    } catch {
      continue;
    }
  }

  return suggestions;
};

/**
 * Validates all profile data
 */
export const validateProfileData = (profileData: ProfileData): ValidationResult => {
  const displayNameValidation = validateDisplayName(profileData.display_name);
  if (!displayNameValidation.isValid) {
    return displayNameValidation;
  }

  const usernameValidation = validateUsername(profileData.user_name);
  if (!usernameValidation.isValid) {
    return usernameValidation;
  }

  const dobValidation = validateDateOfBirth(profileData.date_of_birth);
  if (!dobValidation.isValid) {
    return dobValidation;
  }

  if (!profileData.gender) {
    return { isValid: false, error: 'Gender is required' };
  }

  if (!(VALID_GENDERS as readonly string[]).includes(profileData.gender)) {
    return { isValid: false, error: 'Invalid gender value' };
  }

  return { isValid: true };
};
