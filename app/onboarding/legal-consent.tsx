import * as React from 'react';
import { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_URLS,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from '../../src/constants/legal';
import { saveCurrentUserLegalAcceptance } from '../../src/services/legalAcceptanceService';
import { ROUTES, determinePostAuthRoute } from '../../src/utils/authNavigation';
import { supabase } from '../../src/lib/supabase';

const PRIMARY_GRADIENT = ['#2563eb', '#7e22ce'] as const;

const LegalConsentScreen: React.FC = () => {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const openTerms = () => {
    Linking.openURL(LEGAL_URLS.terms).catch(() => {
      Alert.alert('Unable to open link', 'Please try again in a moment.');
    });
  };

  const openPrivacy = () => {
    Linking.openURL(LEGAL_URLS.privacy).catch(() => {
      Alert.alert('Unable to open link', 'Please try again in a moment.');
    });
  };

  const openExternalUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Unable to open link', 'Please try again in a moment.');
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace(ROUTES.auth);
  };

  const handleAccept = async () => {
    if (!accepted || submitting) {
      return;
    }

    setSubmitting(true);
    const { success, error } = await saveCurrentUserLegalAcceptance();

    if (!success || error) {
      Alert.alert(
        'Unable to Continue',
        'We could not save your legal acceptance. Please try again.',
      );
      setSubmitting(false);
      return;
    }

    const nextRoute = await determinePostAuthRoute();
    router.replace(nextRoute ?? ROUTES.home);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Legal Consent Required</Text>
          <Text style={styles.description}>
            Before entering Zenlit, you must explicitly accept both our Terms of Service and Privacy Policy.
          </Text>
          <Text style={styles.versionMeta}>
            Terms {TERMS_VERSION} | Privacy {PRIVACY_VERSION} | Effective {LEGAL_EFFECTIVE_DATE}
          </Text>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            onPress={() => setAccepted((previous) => !previous)}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, accepted ? styles.checkboxChecked : null]}>
              {accepted ? <Feather name="check" size={14} color="#ffffff" /> : null}
            </View>
            <Text style={styles.checkboxText}>
              I agree to the{' '}
              <Text style={styles.link} onPress={openTerms}>Terms of Service</Text>
              {' '}and acknowledge the{' '}
              <Text style={styles.link} onPress={openPrivacy}>Privacy Policy</Text>
              .
            </Text>
          </Pressable>

          <Pressable
            onPress={handleAccept}
            disabled={!accepted || submitting}
            style={[styles.primaryButton, (!accepted || submitting) ? styles.disabled : null]}
          >
            <LinearGradient colors={PRIMARY_GRADIENT} style={styles.gradient}>
              <Text style={styles.primaryLabel}>
                {submitting ? 'Saving...' : 'Accept and Continue'}
              </Text>
            </LinearGradient>
          </Pressable>

          <View style={styles.secondaryActions}>
            <Pressable onPress={handleLogout}>
              <Text style={styles.secondaryActionLabel}>Log out</Text>
            </Pressable>
            <Pressable onPress={() => void openExternalUrl(LEGAL_URLS.accountDeletion)}>
              <Text style={styles.secondaryActionLabel}>Delete account</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 20,
    gap: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  description: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  versionMeta: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  checkboxText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    color: '#60a5fa',
    textDecorationLine: 'underline',
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  gradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.45,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryActionLabel: {
    color: '#94a3b8',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});

export default LegalConsentScreen;
