import type { Category } from '@/theme';

export type Role = 'ADMIN' | 'AUTHOR' | 'STUDENT';

export type Post = {
  id: string;
  title: string;
  text: string;
  category: Category;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  authors: { id: string; name: string; userId: string | null } | null;
};

export type PostInput = { title: string; text: string; category: Category };

export type SessionUser = {
  id: string;
  name: string;
  role: Role;
  authorId: string | null;
};

export type LoginResponse = {
  message: string;
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: SessionUser;
};

export type AuthorSummary = {
  id: string;
  name: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  postCount: number;
};

export type AuthorInput = { name: string; email: string; password: string };
