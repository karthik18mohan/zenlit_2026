import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type LegalDocumentScreenProps = {
  title: string;
  children: React.ReactNode;
};

const LegalDocumentScreen: React.FC<LegalDocumentScreenProps> = ({ title, children }) => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};

export const LegalSection: React.FC<{ heading: string; children: React.ReactNode }> = ({
  heading,
  children,
}) => (
  <View style={styles.section}>
    <Text style={styles.heading}>{heading}</Text>
    {children}
  </View>
);

export const LegalParagraph: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.paragraph}>{children}</Text>
);

export const LegalBullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.bullet}>• {children}</Text>
);

export const LegalLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <Pressable onPress={() => Linking.openURL(href)}>
    <Text style={styles.link}>{children}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 14,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  section: {
    gap: 8,
  },
  heading: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  paragraph: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 21,
  },
  bullet: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 21,
    paddingLeft: 4,
  },
  link: {
    color: '#60a5fa',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
});

export default LegalDocumentScreen;
