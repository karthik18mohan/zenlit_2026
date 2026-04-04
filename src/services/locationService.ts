import { Platform } from 'react-native';
import * as Location from 'expo-location';

const GEO_OPTS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 15000,
  maximumAge: 60000,
};

export type LocationCoords = {
  latitude: number;
  longitude: number;
};

export type LocationError = {
  code: number;
  message: string;
};

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export type LocationPermissionSnapshot = {
  status: LocationPermissionStatus;
  canAskAgain: boolean;
  servicesEnabled: boolean;
};

const getErrorCode = (error: any): number => {
  if (Platform.OS === 'web') {
    return error.code || 0;
  }
  return 1;
};

const normalizeStatus = (status: Location.PermissionStatus): LocationPermissionStatus => {
  if (status === 'granted') {
    return 'granted';
  }
  if (status === 'denied') {
    return 'denied';
  }
  return 'undetermined';
};

const getWebPermissionSnapshot = (): LocationPermissionSnapshot => {
  if (!('geolocation' in navigator)) {
    return {
      status: 'denied',
      canAskAgain: false,
      servicesEnabled: false,
    };
  }

  return {
    status: 'undetermined',
    canAskAgain: true,
    servicesEnabled: true,
  };
};

export const requestLocationPermission = async (): Promise<LocationPermissionStatus> => {
  const permission = await requestLocationPermissionWithMeta();
  return permission.status;
};

export const requestLocationPermissionWithMeta = async (): Promise<LocationPermissionSnapshot> => {
  if (Platform.OS === 'web') {
    return getWebPermissionSnapshot();
  }

  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    const response = await Location.requestForegroundPermissionsAsync();

    return {
      status: normalizeStatus(response.status),
      canAskAgain: response.canAskAgain,
      servicesEnabled,
    };
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return {
      status: 'denied',
      canAskAgain: false,
      servicesEnabled: false,
    };
  }
};

export const checkLocationPermission = async (): Promise<LocationPermissionStatus> => {
  const permission = await checkLocationPermissionWithMeta();
  return permission.status;
};

export const checkLocationPermissionWithMeta = async (): Promise<LocationPermissionSnapshot> => {
  if (Platform.OS === 'web') {
    return getWebPermissionSnapshot();
  }

  try {
    const [servicesEnabled, response] = await Promise.all([
      Location.hasServicesEnabledAsync(),
      Location.getForegroundPermissionsAsync(),
    ]);

    return {
      status: normalizeStatus(response.status),
      canAskAgain: response.canAskAgain,
      servicesEnabled,
    };
  } catch (error) {
    console.error('Error checking location permission:', error);
    return {
      status: 'denied',
      canAskAgain: false,
      servicesEnabled: false,
    };
  }
};

export const getCurrentLocation = (): Promise<LocationCoords> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS === 'web') {
      if (!('geolocation' in navigator)) {
        reject({ code: 1, message: 'Geolocation not available' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject({
            code: error.code,
            message: error.message,
          });
        },
        GEO_OPTS
      );
    } else {
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 15000,
        distanceInterval: 0,
      })
        .then((location) => {
          resolve({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        })
        .catch((error) => {
          reject({
            code: getErrorCode(error),
            message: error.message || 'Failed to get location',
          });
        });
    }
  });
};

export const watchLocation = (
  onSuccess: (coords: LocationCoords) => void,
  onError: (error: LocationError) => void,
  interval: number = 60000
): (() => void) => {
  if (Platform.OS === 'web') {
    if (!('geolocation' in navigator)) {
      onError({ code: 1, message: 'Geolocation not available' });
      return () => {};
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startWatching = () => {
      intervalId = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            onSuccess({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            onError({
              code: error.code,
              message: error.message,
            });
          },
          GEO_OPTS
        );
      }, interval);
    };

    startWatching();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }

  let subscription: Location.LocationSubscription | null = null;
  let isActive = true;

  const startWatching = async () => {
    try {
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: interval,
          distanceInterval: 0,
        },
        (location) => {
          if (isActive) {
            onSuccess({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
        }
      );
    } catch (error: any) {
      if (isActive) {
        onError({
          code: getErrorCode(error),
          message: error.message || 'Failed to watch location',
        });
      }
    }
  };

  startWatching();

  return () => {
    isActive = false;
    if (subscription) {
      subscription.remove();
      subscription = null;
    }
  };
};
