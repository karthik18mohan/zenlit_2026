export const isValidDeletePhrase = (value: string): boolean => value.trim().toUpperCase() === 'DELETE';

export const sanitizeOtp = (value: string): string => value.replace(/[^0-9]/g, '').slice(0, 6);

export const isValidEmailAddress = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
