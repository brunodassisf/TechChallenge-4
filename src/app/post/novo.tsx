import { router } from 'expo-router';

import { createPost } from '@/api/posts';
import type { PostInput } from '@/api/types';
import { PostForm } from '@/components/PostForm';
import { useHandleApiError, useRequireToken } from '@/hooks/useAuthGuard';

const EMPTY: PostInput = { title: '', text: '', category: 'GERAL' };

export default function NewPost() {
  const handleApiError = useHandleApiError();
  const requireToken = useRequireToken();

  async function submit(input: PostInput) {
    const token = requireToken();
    if (!token) return;
    try {
      await createPost(input, token);
      router.back();
    } catch (err) {
      if (!handleApiError(err)) throw err;
    }
  }

  return (
    <PostForm title="Novo post" submitLabel="Publicar" initial={EMPTY} onSubmit={submit} onClose={() => router.back()} />
  );
}
