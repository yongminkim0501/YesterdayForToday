import client from './client';

export interface Post {
  id: number;
  title: string;
  content: string;
  summary?: string;
  source_url?: string;
  company?: string;
  created_at: string;
  updated_at?: string;
}

export const getPosts = (params?: { page?: number; limit?: number; keyword?: string }) =>
  client.get('/admin/posts', { params });

export const getPost = (id: number) =>
  client.get<Post>(`/admin/posts/${id}`);

export const createPost = (data: Partial<Post>) =>
  client.post('/admin/posts', data);

export const updatePost = (id: number, data: Partial<Post>) =>
  client.put(`/admin/posts/${id}`, data);

export const deletePost = (id: number) =>
  client.delete(`/admin/posts/${id}`);
