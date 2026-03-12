import client from './client';

export interface Newsletter {
  id: number;
  title: string;
  content: string;
  summary?: string;
  companies?: string[];
  published_at?: string;
  created_at: string;
  updated_at?: string;
  status?: string;
  post_ids?: number[];
}

// Admin endpoints
export const getAdminNewsletters = (params?: { page?: number; limit?: number }) =>
  client.get('/admin/newsletters', { params });

export const getAdminNewsletter = (id: number) =>
  client.get(`/admin/newsletters/${id}`);

export const createNewsletter = (data: Partial<Newsletter>) =>
  client.post('/admin/newsletters', data);

export const updateNewsletter = (id: number, data: Partial<Newsletter>) =>
  client.put(`/admin/newsletters/${id}`, data);

export const deleteNewsletter = (id: number) =>
  client.delete(`/admin/newsletters/${id}`);

export const sendNewsletter = (id: number) =>
  client.post(`/admin/newsletters/${id}/send`);

export const testSendNewsletter = (id: number) =>
  client.post(`/admin/newsletters/${id}/test-send`);

export const previewNewsletter = (id: number) =>
  client.get(`/admin/newsletters/${id}/preview`);
