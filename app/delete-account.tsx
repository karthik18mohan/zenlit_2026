import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  clearLocalUserData,
  deleteCurrentAccount,
  requestDeletionOtp,
  verifyDeletionOtp,
} from '../src/services';
import { supabase } from '../src/lib/supabase';
import { isValidDeletePhrase, isValidEmailAddress, sanitizeOtp } from '../src/utils/accountDeletionUtils';

const DeleteAccountWebPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [typedDelete, setTypedDelete] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const isValidEmail = useMemo(() => isValidEmailAddress(email), [email]);
  const canVerify = useMemo(() => otp.trim().length === 6, [otp]);
  const canDelete = useMemo(() => isValidDeletePhrase(typedDelete), [typedDelete]);

  const handleSendCode = async () => {
    if (!isValidEmail) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }

    setStatus('Sending verification code...');
    const result = await requestDeletionOtp(email.trim());

    if (!result.success) {
      setStatus(null);
      Alert.alert('Could not send code', result.error || 'Please retry in a minute.');
      return;
    }

    setIsVerified(false);
    setCodeSent(true);
    setStatus('Verification code sent. Check your inbox.');
  };

  const handleVerify = async () => {
    if (!canVerify || verifying) {
      return;
    }

    setVerifying(true);
    const result = await verifyDeletionOtp(email.trim(), otp.trim());
    setVerifying(false);

    if (!result.success) {
      Alert.alert('Verification failed', result.error || 'Please check the code and try again.');
      return;
    }

    setIsVerified(true);
    setStatus('Identity verified. You can now permanently delete your account.');
  };

  const handleDelete = async () => {
    if (!isVerified || !canDelete || deleting) {
      return;
    }

    setDeleting(true);
    const result = await deleteCurrentAccount();

    if (!result.success) {
      setDeleting(false);
      Alert.alert('Deletion failed', result.error || 'Please sign in again and retry.');
      return;
    }

    await clearLocalUserData();
    await supabase.auth.signOut({ scope: 'global' });

    setDeleting(false);
    setStatus('Your account has been permanently deleted.');
    setOtp('');
    setTypedDelete('');
    setIsVerified(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Delete Zenlit Account</Text>
          <Text style={styles.subtitle}>
            This page lets you permanently delete your account and all linked user data, even if the app is uninstalled.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>1) Verify your account email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              editable={!codeSent}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#64748b"
            />
            <Pressable style={styles.primaryButton} onPress={handleSendCode}>
              <Text style={styles.primaryButtonLabel}>{codeSent ? 'Resend code' : 'Send verification code'}</Text>
            </Pressable>

            {codeSent ? (
              <>
                <Text style={[styles.label, styles.blockTop]}>2) Enter 6-digit code</Text>
                <TextInput
                  value={otp}
                  onChangeText={(text) => setOtp(sanitizeOtp(text))}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.input}
                  placeholder="123456"
                  placeholderTextColor="#64748b"
                />
                <Pressable style={[styles.secondaryButton, !canVerify ? styles.disabled : null]} onPress={handleVerify} disabled={!canVerify || verifying}>
                  {verifying ? <ActivityIndicator color="#e2e8f0" /> : <Text style={styles.secondaryButtonLabel}>Verify code</Text>}
                </Pressable>
              </>
            ) : null}

            <Text style={[styles.label, styles.blockTop]}>3) Type DELETE and confirm</Text>
            {!isVerified ? (
              <Text style={styles.inlineHelpText}>Complete step 2 before permanent deletion is enabled.</Text>
            ) : null}
            <TextInput
              value={typedDelete}
              onChangeText={setTypedDelete}
              autoCapitalize="characters"
              style={styles.input}
              placeholder="DELETE"
              placeholderTextColor="#64748b"
            />
            <Pressable
              style={[styles.deleteButton, (!isVerified || !canDelete) ? styles.disabled : null]}
              onPress={handleDelete}
              disabled={!isVerified || !canDelete || deleting}
            >
              {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteButtonLabel}>Permanently delete account</Text>}
            </Pressable>

            {status ? <Text style={styles.status}>{status}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  root: { flex: 1, backgroundColor: '#000' },
  scroll: { padding: 20, gap: 14 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#cbd5e1', lineHeight: 20 },
  card: {
    backgroundColor: '#020617',
    borderColor: 'rgba(148,163,184,0.35)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  label: { color: '#f1f5f9', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  blockTop: { marginTop: 18 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: { marginTop: 10, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  primaryButtonLabel: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: 'rgba(30,41,59,0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryButtonLabel: { color: '#e2e8f0', fontWeight: '700' },
  deleteButton: { marginTop: 10, backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  deleteButtonLabel: { color: '#fff', fontWeight: '800' },
  disabled: { opacity: 0.45 },
  status: { marginTop: 12, color: '#93c5fd' },
  inlineHelpText: { marginBottom: 8, color: '#fda4af', fontSize: 12 },
});

export default DeleteAccountWebPage;
