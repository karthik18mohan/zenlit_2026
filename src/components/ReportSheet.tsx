import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  reportContent,
  type ContentType,
  type ReportReason,
} from '../services/moderationService';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'threats', label: 'Threats or violence' },
  { value: 'other', label: 'Other' },
];

type ReportSheetProps = {
  visible: boolean;
  onClose: () => void;
  reportedUserId: string;
  contentType: ContentType;
  contentId?: string;
};

const ReportSheet: React.FC<ReportSheetProps> = ({
  visible,
  onClose,
  reportedUserId,
  contentType,
  contentId,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);

    const result = await reportContent({
      reportedUserId,
      contentType,
      contentId,
      reason: selectedReason,
      description: description.trim() || undefined,
    });

    setSubmitting(false);

    if (result.success) {
      Alert.alert('Report Submitted', 'Thank you. We will review this report.');
      setSelectedReason(null);
      setDescription('');
      onClose();
    } else {
      Alert.alert('Error', result.error || 'Failed to submit report. Please try again.');
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Report {contentType}</Text>
            <Pressable onPress={handleClose} hitSlop={8} accessibilityLabel="Close">
              <Feather name="x" size={20} color="#94a3b8" />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Why are you reporting this {contentType}?
          </Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {REASONS.map(({ value, label }) => (
              <Pressable
                key={value}
                style={[styles.reasonRow, selectedReason === value && styles.reasonSelected]}
                onPress={() => setSelectedReason(value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedReason === value }}
              >
                <View style={[styles.radio, selectedReason === value && styles.radioActive]}>
                  {selectedReason === value && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.reasonLabel}>{label}</Text>
              </Pressable>
            ))}

            <TextInput
              style={styles.input}
              placeholder="Additional details (optional)"
              placeholderTextColor="#64748b"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          </ScrollView>

          <Pressable
            style={[
              styles.submitButton,
              (!selectedReason || submitting) && styles.submitDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedReason || submitting}
          >
            <Text style={styles.submitLabel}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.65)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148, 163, 184, 0.4)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(71, 85, 105, 0.6)',
  },
  title: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 14,
    marginBottom: 10,
  },
  scroll: { flexGrow: 0 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  reasonSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: '#3b82f6',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  reasonLabel: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '500',
  },
  input: {
    marginTop: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.4)',
    color: '#e2e8f0',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 80,
  },
  submitButton: {
    marginTop: 16,
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.45,
  },
  submitLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ReportSheet;
