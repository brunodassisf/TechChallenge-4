import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius } from '@/theme';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  children?: ReactNode;
  /** Sem confirmLabel/onConfirm o sheet só tem o botão de fechar. */
  confirmLabel?: string;
  onConfirm?: () => void;
  cancelLabel?: string;
  onCancel: () => void;
  loading?: boolean;
};

export function ConfirmSheet({
  visible,
  title,
  message,
  children,
  confirmLabel,
  onConfirm,
  cancelLabel = 'Cancelar',
  onCancel,
  loading,
}: Props) {
  const insets = useSafeAreaInsets();
  const close = () => {
    if (!loading) onCancel();
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.dim} onPress={close} accessibilityLabel="Fechar" />
      <View style={[styles.sheet, { paddingBottom: 34 + insets.bottom }]}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {children}
        {confirmLabel && onConfirm ? (
          <PrimaryButton label={confirmLabel} onPress={onConfirm} loading={loading} tone="danger" />
        ) : null}
        <Pressable onPress={close} style={styles.cancel} accessibilityRole="button" disabled={loading}>
          <Text style={styles.cancelText}>{cancelLabel}</Text>
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
