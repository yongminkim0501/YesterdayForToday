import client from './client';

export const subscribe = (email: string) =>
  client.post('/subscribers', { email });

export const verifyEmail = (token: string) =>
  client.get(`/subscribers/verify-email?token=${token}`);

export const unsubscribe = (token: string) =>
  client.post('/subscribers/unsubscribe', { token });

export const verifyUnsubscribeToken = (token: string) =>
  client.get(`/subscribers/verify-token?token=${token}`);

export const getSubscribers = (params?: { page?: number; limit?: number; keyword?: string }) =>
  client.get('/admin/subscribers', { params });

export const createSubscriber = (email: string) =>
  client.post('/admin/subscribers', { email });

export const deleteSubscriber = (id: number) =>
  client.delete(`/admin/subscribers/${id}`);

export const exportSubscribers = () =>
  client.get('/admin/subscribers/export', { responseType: 'blob' });
