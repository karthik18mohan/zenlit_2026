import '../src/polyfills';
import '../src/utils/applyWebShadowPatch';

import React, { useEffect, useState, useRef } from 'react';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_500Medium } from '@expo-google-fonts/inter';
import * as Notifications from 'expo-notifications';

import { VisibilityProvider } from '../src/contexts/VisibilityContext';
import { MessagingProvider } from '../src/contexts/MessagingContext';
import { ProfileProvider } from '../src/contexts/ProfileContext';
import { theme } from '../src/styles/theme';
import { supabase, supabaseReady } from '../src/lib/supabase';
import Navigation from '../src/components/Navigation';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { logger } from '../src/utils/logger';
import { determinePostAuthRoute, ROUTES } from '../src/utils/authNavigation';
import { hasCurrentUserAcceptedLatestLegal } from '../src/services/legalAcceptanceService';
import { useNotifications } from '../src/hooks/useNotifications';
import { readHasSeenGetStarted, persistHasSeenGetStarted } from '../src/utils/getStartedPreference';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const RootLayout: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const segments = useSegments();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [fontsLoaded] = useFonts({ Inter_500Medium });
  const navigationInitialized = useRef(false);
  const lastAuthState = useRef<boolean | null>(null);
  const { notification } = useNotifications();
  const [hasSeenGetStarted, setHasSeenGetStarted] = useState<boolean | null>(null);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState<boolean | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      window.requestAnimationFrame(() => {
        const activeElement = document.activeElement as HTMLElement | null;
        activeElement?.blur();
      });
    }
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;
    readHasSeenGetStarted()
      .then((seen) => {
        if (isMounted) {
          setHasSeenGetStarted(seen);
        }
      })
      .catch((error) => {
        logger.warn('App', 'Failed to load landing preference', error);
        if (isMounted) {
          setHasSeenGetStarted(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const checkInitialAuth = async () => {
      try {
        if (!supabaseReady) {
          logger.warn('App', 'Supabase not ready, skipping session check');
          setIsCheckingAuth(false);
          setIsAuthenticated(false);
          setHasAcceptedLegal(false);
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        const hasSession = !!session;

        setIsAuthenticated(hasSession);
        lastAuthState.current = hasSession;

        if (hasSession) {
          const { accepted } = await hasCurrentUserAcceptedLatestLegal();
          setHasAcceptedLegal(accepted);
        } else {
          setHasAcceptedLegal(false);
        }

        setIsCheckingAuth(false);

        // Reduced logging
      } catch (err) {
        logger.error('Auth', 'Error checking session:', err);
        setIsAuthenticated(false);
        setHasAcceptedLegal(false);
        setIsCheckingAuth(false);
      }
    };

    checkInitialAuth();
  }, []);

  useEffect(() => {
    if (!supabaseReady) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        const hasSession = !!session;

        if (lastAuthState.current === hasSession) {
          return;
        }

        setIsAuthenticated(hasSession);
        lastAuthState.current = hasSession;

        if (event === 'SIGNED_IN' && hasSession) {
          try {
            const { accepted } = await hasCurrentUserAcceptedLatestLegal();
            setHasAcceptedLegal(accepted);
            setHasSeenGetStarted(true);
            void persistHasSeenGetStarted();
            navigationInitialized.current = true;
            const targetRoute = await determinePostAuthRoute();
            router.replace(targetRoute ?? ROUTES.home);
          } catch (error) {
            logger.error('Auth', 'Failed to handle sign-in state change', error);
            setHasAcceptedLegal(false);
            router.replace(ROUTES.legalConsent);
          }
        } else if (event === 'SIGNED_OUT') {
          setHasAcceptedLegal(false);
          navigationInitialized.current = false;
          router.replace(ROUTES.auth);
        }
      }
    );
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (isAuthenticated) {
      setHasSeenGetStarted(true);
      void persistHasSeenGetStarted();
    }
  }, [isAuthenticated]);


  useEffect(() => {
    if (!isAuthenticated || hasAcceptedLegal !== null) {
      return;
    }

    hasCurrentUserAcceptedLatestLegal()
      .then(({ accepted }) => setHasAcceptedLegal(accepted))
      .catch((error) => {
        logger.error('Auth', 'Failed to load legal acceptance state', error);
        setHasAcceptedLegal(false);
      });
  }, [hasAcceptedLegal, isAuthenticated]);
  useEffect(() => {
    if (notification && notification.request.content.data) {
      const data = notification.request.content.data;
      logger.info('Notification', 'Received notification in foreground:', data);

      if (data.type === 'message' && data.senderId) {
        router.push(`/messages/${data.senderId}`);
      }
    }
  }, [notification, router]);

  useEffect(() => {
    if (!fontsLoaded || isCheckingAuth || isAuthenticated === null || hasSeenGetStarted === null || hasAcceptedLegal === null) {
      return;
    }

    if (navigationInitialized.current) {
      return;
    }

    const currentSegment = segments[0];
    const inAuthGroup = currentSegment === 'auth' || currentSegment === 'onboarding';
    const isPublicDeletePage = currentSegment === 'delete-account';
    const isPublicLegalPage = currentSegment === 'privacy' || currentSegment === 'terms';
    const onGetStarted = !currentSegment || currentSegment === 'index';
    const skipLanding = hasSeenGetStarted === true;

    if (isAuthenticated) {
      const onLegalConsent = pathname === ROUTES.legalConsent;
      if (!hasAcceptedLegal && !onLegalConsent && !isPublicDeletePage) {
        navigationInitialized.current = true;
        router.replace(ROUTES.legalConsent);
        return;
      }

      if (inAuthGroup || onGetStarted) {
        navigationInitialized.current = true;
        determinePostAuthRoute().then((targetRoute) => {
          router.replace(targetRoute ?? ROUTES.home);
        }).catch((error) => {
          logger.error('Auth', 'Failed to determine post-auth route', error);
          router.replace(ROUTES.home);
        });
      }
    } else {
      if (isPublicDeletePage || isPublicLegalPage) {
        return;
      }
      if (skipLanding && onGetStarted) {
        navigationInitialized.current = true;
        router.replace(ROUTES.auth);
      } else if (skipLanding && !inAuthGroup && !onGetStarted) {
        navigationInitialized.current = true;
        router.replace(ROUTES.auth);
      } else if (!skipLanding && !inAuthGroup && !onGetStarted) {
        navigationInitialized.current = true;
        router.replace(ROUTES.landing);
      }
    }
  }, [hasAcceptedLegal, isAuthenticated, pathname, segments, router, fontsLoaded, isCheckingAuth, hasSeenGetStarted]);

  if (!fontsLoaded || isCheckingAuth || isAuthenticated === null || hasSeenGetStarted === null || hasAcceptedLegal === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const inAuthGroup = segments[0] === 'auth' || segments[0] === 'onboarding';
  const onGetStarted = !segments[0] || segments[0] === 'index';
  const isPublicDeletePage = segments[0] === 'delete-account';
  const isPublicLegalPage = segments[0] === 'privacy' || segments[0] === 'terms';
  const shouldShowNav = isAuthenticated && !inAuthGroup && !onGetStarted && !isPublicDeletePage && !isPublicLegalPage;

  return (
    <SafeAreaProvider>
      <VisibilityProvider>
        <MessagingProvider>
          <ProfileProvider>
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
              <StatusBar style="light" backgroundColor={theme.colors.background} />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: theme.colors.background },
                }}
              >
                {/** Ensure Get Started (index) is fully immersive: no header */}
                <Stack.Screen name="index" options={{ headerShown: false }} />
              </Stack>
              {shouldShowNav ? <Navigation /> : null}
            </View>
          </ProfileProvider>
        </MessagingProvider>
      </VisibilityProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#94a3b8',
    fontSize: 16,
  },
});

export default RootLayout;
