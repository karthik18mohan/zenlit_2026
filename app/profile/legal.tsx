import React, { useCallback } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import AppHeader from '../../src/components/AppHeader';
import { LEGAL_URLS } from '../../src/constants/legal';

type LegalEntry = {
  id: 'privacy' | 'terms' | 'deletion';
  label: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  destination: string;
};

const LEGAL_ENTRIES: LegalEntry[] = [
  {
    id: 'privacy',
    label: 'Privacy Policy',
    description: 'See how Zenlit collects, uses, and protects your data.',
    icon: 'lock',
    destination: LEGAL_URLS.privacy,
  },
  {
    id: 'terms',
    label: 'Terms of Service',
    description: 'Read the rules and conditions for using Zenlit.',
    icon: 'file-text',
    destination: LEGAL_URLS.terms,
  },
  {
    id: 'deletion',
    label: 'Account Deletion Information',
    description: 'Learn how to permanently delete your account on web.',
    icon: 'trash-2',
    destination: LEGAL_URLS.accountDeletion,
  },
];

const ProfileLegalScreen: React.FC = () => {
  const openDestination = useCallback((destination: string) => {
    Linking.openURL(destination);
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader title="Legal" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Access important legal documents and account deletion details.
        </Text>

        {LEGAL_ENTRIES.map((entry) => (
          <Pressable
            key={entry.id}
            style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
            onPress={() => openDestination(entry.destination)}
          >
            <View style={styles.iconWrap}>
              <Feather name={entry.icon} size={18} color="#ffffff" />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.rowTitle}>{entry.label}</Text>
              <Text style={styles.rowDescription}>{entry.description}</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94a3b8" />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.65)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#020617',
  },
  rowPressed: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  rowDescription: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
});

export default ProfileLegalScreen;
