import client from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface AdminStats {
  subscriberCount: number;
  newsletterCount: number;
  postCount: number;
}

export const login = (data: LoginRequest) =>
  client.post<LoginResponse>('/admin/login', data);

export const getStats = () =>
  client.get<AdminStats>('/admin/stats');
