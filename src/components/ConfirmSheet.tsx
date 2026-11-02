import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/theme';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function ConfirmSheet({ visible, title, message, confirmLabel, onConfirm, onCancel, loading }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.dim} onPress={onCancel} accessibilityLabel="Fechar" />
      <View style={styles.sheet}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <PrimaryButton label={confirmLabel} onPress={onConfirm} loading={loading} tone="danger" />
        <Pressable onPress={onCancel} style={styles.cancel} accessibilityRole="button" disabled={loading}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    padding: 18,
    paddingBottom: 34,
  },
  title: { fontFamily: fonts.display800, fontSize: 20, color: colors.text, marginBottom: 6 },
  message: { fontFamily: fonts.body400, fontSize: 13, lineHeight: 19, color: colors.textMuted, marginBottom: 18 },
  cancel: {
    marginTop: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.pill,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelText: { fontFamily: fonts.display800, fontSize: 15, color: colors.text },
});
