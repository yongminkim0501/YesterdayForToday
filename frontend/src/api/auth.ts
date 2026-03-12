import client from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  username: string;
}

export interface AdminStats {
  subscribers: {
    total: number;
    active: number;
  };
  posts: {
    total: number;
  };
  newsletters: {
    total: number;
    sent: number;
  };
}

export const login = (data: LoginRequest) =>
  client.post<LoginResponse>('/admin/login', data);

export const getStats = () =>
  client.get<AdminStats>('/admin/stats');
