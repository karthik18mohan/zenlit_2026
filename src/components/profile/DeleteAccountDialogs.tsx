import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { isValidDeletePhrase } from '../../utils/accountDeletionUtils';

type DeleteAccountDialogsProps = {
  visible: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

const DeleteAccountDialogs: React.FC<DeleteAccountDialogsProps> = ({
  visible,
  loading,
  onClose,
  onConfirm,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [typedConfirmation, setTypedConfirmation] = useState('');

  const canDelete = useMemo(() => isValidDeletePhrase(typedConfirmation), [typedConfirmation]);

  const resetState = () => {
    setStep(1);
    setTypedConfirmation('');
  };

  const handleDismiss = () => {
    if (loading) {
      return;
    }
    resetState();
    onClose();
  };

  const handleConfirm = async () => {
    if (!canDelete || loading) {
      return;
    }
    await onConfirm();
    resetState();
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPress} onPress={handleDismiss} />
        <View style={styles.card}>
          {step === 1 ? (
            <>
              <Text style={styles.title}>Delete your account?</Text>
              <Text style={styles.body}>
                This action permanently deletes your profile, posts, messages, location data, push tokens,
                uploaded media, and app settings. This cannot be undone.
              </Text>
              <View style={styles.actionsRow}>
                <Pressable style={[styles.button, styles.cancelButton]} onPress={handleDismiss}>
                  <Text style={styles.cancelLabel}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.button, styles.warningButton]} onPress={() => setStep(2)}>
                  <Text style={styles.warningLabel}>Continue</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Final confirmation</Text>
              <Text style={styles.body}>Type <Text style={styles.emphasis}>DELETE</Text> to permanently remove your account.</Text>
              <TextInput
                value={typedConfirmation}
                onChangeText={setTypedConfirmation}
                autoCapitalize="characters"
                editable={!loading}
                style={styles.input}
                placeholder="Type DELETE"
                placeholderTextColor="#94a3b8"
              />
              <View style={styles.actionsRow}>
                <Pressable style={[styles.button, styles.cancelButton]} onPress={handleDismiss} disabled={loading}>
                  <Text style={styles.cancelLabel}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.deleteButton, (!canDelete || loading) ? styles.disabledButton : null]}
                  onPress={handleConfirm}
                  disabled={!canDelete || loading}
                  accessibilityLabel="Delete account permanently"
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.deleteLabel}>Delete account</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#020617',
    borderColor: 'rgba(148, 163, 184, 0.35)',
    borderWidth: 1,
  },
  title: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 10,
  },
  body: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  emphasis: {
    color: '#fca5a5',
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.5)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: '#ffffff',
    marginBottom: 14,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(30,41,59,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.6)',
  },
  warningButton: {
    backgroundColor: 'rgba(239,68,68,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.6)',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  disabledButton: {
    opacity: 0.4,
  },
  cancelLabel: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: 14,
  },
  warningLabel: {
    color: '#fca5a5',
    fontWeight: '700',
    fontSize: 14,
  },
  deleteLabel: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});

export default DeleteAccountDialogs;
