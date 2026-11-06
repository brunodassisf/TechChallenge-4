import type { AuthorSummary } from '@/api/types';
import { ConfirmSheet } from './ConfirmSheet';

type Props = { author: AuthorSummary | null; loading: boolean; onConfirm: () => void; onClose: () => void };

export function DeactivateAuthorSheet({ author, loading, onConfirm, onClose }: Props) {
  return (
    <ConfirmSheet
      visible={!!author}
      title={`Desativar ${author?.name ?? ''}?`}
      message="A pessoa não consegue mais entrar no app nem no site. Os posts continuam publicados. Dá para reativar depois."
      confirmLabel="Desativar professor"
      onConfirm={onConfirm}
      onCancel={onClose}
      loading={loading}
    />
  );
}
