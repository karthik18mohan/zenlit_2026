import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { SOCIAL_PLATFORM_IDS, SOCIAL_PLATFORMS } from '../constants/socialPlatforms';
import { useVisibility } from '../contexts/VisibilityContext';

const INSTAGRAM_GRADIENT = [
  '#f09433',
  '#e6683c',
  '#dc2743',
  '#cc2366',
  '#bc1888',
] as const;

export type VisibilitySheetProps = {
  visible: boolean;
  onRequestClose: () => void;
};

export const VisibilitySheet: React.FC<VisibilitySheetProps> = ({ visible, onRequestClose }) => {
  const translateY = useRef(new Animated.Value(1)).current;
  const {
    isVisible,
    setIsVisible,
    selectedAccounts,
    toggleAccount,
    selectAll,
    deselectAll,
    locationStatus,
    requestLocationPermission,
    refreshLocationPermissionState,
  } = useVisibility();
  const [showLocationRationale, setShowLocationRationale] = useState(false);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : 1,
      duration: 260,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [translateY, visible]);

  const handleOpenSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert('Unable to open settings', 'Please open your device settings and allow Location for Zenlit.');
    }
  }, []);

  const handleVisibilityToggle = useCallback(async (nextValue: boolean) => {
    if (!nextValue) {
      setIsVisible(false, 'user');
      return;
    }

    if (locationStatus === 'permission-blocked' || locationStatus === 'services-disabled') {
      return;
    }

    setShowLocationRationale(true);
  }, [locationStatus, setIsVisible]);

  const handleContinueToSystemPrompt = useCallback(async () => {
    setShowLocationRationale(false);
    await requestLocationPermission({ autoEnable: true });
  }, [requestLocationPermission]);

  const handleRetryPermission = useCallback(async () => {
    await requestLocationPermission({ autoEnable: true });
  }, [requestLocationPermission]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const refresh = async () => {
      await refreshLocationPermissionState();
    };

    refresh();
  }, [refreshLocationPermissionState, visible]);

  const showDeniedMessage = locationStatus === 'permission-denied';
  const showBlockedMessage = locationStatus === 'permission-blocked';
  const showServicesDisabled = locationStatus === 'services-disabled';

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [
                {
                  translateY: translateY.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 420],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Visibility</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>Visible to nearby users</Text>
                <Text style={styles.sectionSubtitle}>
                  Control whether your profile appears in radar results.
                </Text>
              </View>
              <Switch
                value={isVisible}
                onValueChange={handleVisibilityToggle}
                thumbColor="#ffffff"
                trackColor={{ false: 'rgba(71, 85, 105, 0.7)', true: '#3b82f6' }}
                ios_backgroundColor="rgba(71, 85, 105, 0.7)"
              />
            </View>
          </View>

          {showDeniedMessage ? (
            <View style={styles.permissionInfoCard}>
              <Text style={styles.permissionInfoTitle}>Location permission was denied</Text>
              <Text style={styles.permissionInfoText}>
                To appear in Radar, allow foreground location. You can continue using the app with
                Radar visibility off.
              </Text>
              <Pressable style={styles.primaryButton} onPress={handleRetryPermission}>
                <Text style={styles.primaryButtonLabel}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {showBlockedMessage ? (
            <View style={styles.permissionInfoCard}>
              <Text style={styles.permissionInfoTitle}>Location permission is blocked</Text>
              <Text style={styles.permissionInfoText}>
                Location access is turned off with "Don't ask again". Open settings to enable
                foreground location for Zenlit.
              </Text>
              <Pressable style={styles.primaryButton} onPress={handleOpenSettings}>
                <Text style={styles.primaryButtonLabel}>Open settings</Text>
              </Pressable>
            </View>
          ) : null}

          {showServicesDisabled ? (
            <View style={styles.permissionInfoCard}>
              <Text style={styles.permissionInfoTitle}>Location services are off</Text>
              <Text style={styles.permissionInfoText}>
                Turn on device location services to use Radar visibility. Other features continue to
                work without location.
              </Text>
              <Pressable style={styles.primaryButton} onPress={handleOpenSettings}>
                <Text style={styles.primaryButtonLabel}>Open settings</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Social platforms</Text>
              <View style={styles.sectionActions}>
                <Pressable onPress={selectAll}>
                  <Text style={styles.actionTextSelectAll}>Select All</Text>
                </Pressable>
                <View style={styles.divider} />
                <Pressable onPress={deselectAll}>
                  <Text style={styles.actionTextClear}>Clear All</Text>
                </Pressable>
              </View>
            </View>

            {SOCIAL_PLATFORM_IDS.map((platformId) => {
              const meta = SOCIAL_PLATFORMS[platformId];
              const isSelected = selectedAccounts.includes(platformId);
              return (
                <Pressable
                  key={platformId}
                  style={[styles.platformRow, isSelected ? styles.platformActive : null]}
                  onPress={() => toggleAccount(platformId)}
                >
                  <View style={styles.platformLeft}>
                    {platformId === 'instagram' ? (
                      <LinearGradient
                        colors={INSTAGRAM_GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.platformIcon}
                      >
                        {meta.renderIcon({ size: 16, color: '#ffffff' })}
                      </LinearGradient>
                    ) : (
                      <View
                        style={[
                          styles.platformIcon,
                          meta.style.backgroundColor ? { backgroundColor: meta.style.backgroundColor } : null,
                        ]}
                      >
                        {meta.renderIcon({ size: 16, color: meta.wantsWhiteIcon ? '#ffffff' : '#94a3b8' })}
                      </View>
                    )}
                    <Text style={styles.platformLabel}>{meta.label}</Text>
                  </View>
                  <View style={[styles.checkbox, isSelected ? styles.checkboxActive : null]}>
                    {isSelected ? <Feather name="check" size={16} color="#ffffff" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>

      <Modal
        transparent
        visible={showLocationRationale}
        animationType="fade"
        onRequestClose={() => setShowLocationRationale(false)}
      >
        <View style={styles.rationaleBackdrop}>
          <View style={styles.rationaleCard}>
            <Text style={styles.rationaleTitle}>Enable location for Radar?</Text>
            <Text style={styles.rationaleBody}>
              Zenlit uses your foreground location only while you are using the app to show nearby
              people in Radar and keep your visibility accurate.
            </Text>
            <Text style={styles.rationaleBody}>
              If you skip this, you can still use messaging and your profile, but Radar discovery
              stays limited.
            </Text>
            <View style={styles.rationaleActions}>
              <Pressable
                style={[styles.rationaleButton, styles.rationaleButtonSecondary]}
                onPress={() => setShowLocationRationale(false)}
              >
                <Text style={styles.rationaleButtonSecondaryLabel}>Not now</Text>
              </Pressable>
              <Pressable
                style={[styles.rationaleButton, styles.rationaleButtonPrimary]}
                onPress={handleContinueToSystemPrompt}
              >
                <Text style={styles.rationaleButtonPrimaryLabel}>Continue</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#020617',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  section: {
    marginTop: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionCopy: {
    flex: 1,
    marginRight: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionSubtitle: {
    marginTop: 4,
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionTextSelectAll: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '600',
  },
  actionTextClear: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(71, 85, 105, 0.6)',
    marginHorizontal: 10,
  },
  platformRow: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.7)',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  platformLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  platformIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  platformActive: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderColor: 'rgba(148, 163, 184, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  platformLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  permissionInfoCard: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    padding: 12,
  },
  permissionInfoTitle: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  permissionInfoText: {
    marginTop: 6,
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  rationaleBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.74)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  rationaleCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    backgroundColor: '#0f172a',
    padding: 16,
  },
  rationaleTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  rationaleBody: {
    marginTop: 10,
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  rationaleActions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  rationaleButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  rationaleButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  rationaleButtonSecondary: {
    backgroundColor: 'rgba(51, 65, 85, 0.95)',
  },
  rationaleButtonPrimaryLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  rationaleButtonSecondaryLabel: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
});

export default VisibilitySheet;
