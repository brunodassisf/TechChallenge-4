import { router } from 'expo-router';
import { useEffect } from 'react';

import { createPost } from '@/api/posts';
import type { PostInput } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { PostForm } from '@/components/PostForm';
import { useHandleApiError, useRequireToken } from '@/hooks/useAuthGuard';
import { canCreatePost } from '@/lib/post';

const EMPTY: PostInput = { title: '', text: '', category: 'GERAL' };

export default function NewPost() {
  const { user } = useAuth();
  const handleApiError = useHandleApiError();
  const requireToken = useRequireToken();

  useEffect(() => {
    if (!canCreatePost(user)) router.replace('/login');
  }, [user]);

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
