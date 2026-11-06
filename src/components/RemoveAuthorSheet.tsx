import { StyleSheet, Text, View } from 'react-native';

import type { AuthorSummary } from '@/api/types';
import { postCountLabel } from '@/lib/admin';
import { fonts } from '@/theme';
import { ConfirmSheet } from './ConfirmSheet';

type Props = {
  author: AuthorSummary | null;
  /** Posts que bloqueiam a remoção (da lista ou do 409). 0 = pode remover. */
  postCount: number;
  loading: boolean;
  onConfirm: () => void;
  onDeactivate: () => void;
  onClose: () => void;
};

export function RemoveAuthorSheet({ author, postCount, loading, onConfirm, onDeactivate, onClose }: Props) {
  const title = `Remover ${author?.name ?? ''}?`;
  if (postCount > 0) {
    return (
      <ConfirmSheet
        visible={!!author}
        title={title}
        confirmLabel="Desativar professor"
        onConfirm={onDeactivate}
        onCancel={onClose}
        loading={loading}
      >
        <View style={styles.warn} accessibilityRole="alert">
          <Text style={styles.warnText}>
            Esta pessoa tem <Text style={styles.bold}>{postCountLabel(postCount)}</Text>. Desative o professor para
            manter os posts publicados.
          </Text>
        </View>
      </ConfirmSheet>
    );
  }
  return (
    <ConfirmSheet
      visible={!!author}
      title={title}
      message="A conta de login dele também será apagada. Não dá para desfazer."
      confirmLabel="Remover professor"
      onConfirm={onConfirm}
      onCancel={onClose}
      loading={loading}
    />
  );
}

const styles = StyleSheet.create({
  warn: {
    backgroundColor: 'rgba(255,179,107,0.15)',
    borderWidth: 1.5,
    borderColor: '#FFB36B',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  warnText: { fontFamily: fonts.body400, fontSize: 13, lineHeight: 19, color: '#FFD7AE' },
  bold: { fontFamily: fonts.body700 },
});
