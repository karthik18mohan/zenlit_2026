import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from './logger';

const HAS_SEEN_GET_STARTED_KEY = 'zenlit_has_seen_get_started';

export const readHasSeenGetStarted = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(HAS_SEEN_GET_STARTED_KEY);
    return value === 'true';
  } catch (error) {
    logger.warn('GetStarted', 'Failed to read landing preference', error);
    return false;
  }
};

export const persistHasSeenGetStarted = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(HAS_SEEN_GET_STARTED_KEY, 'true');
  } catch (error) {
    logger.warn('GetStarted', 'Failed to persist landing preference', error);
  }
};
