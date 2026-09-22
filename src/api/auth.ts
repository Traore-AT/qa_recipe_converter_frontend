import client from './client';
import type { User } from '../types';

export const authApi = {
  login: (username: string, password: string) =>
    client.post<User>('/auth/login/', { username, password }),

  register: (data: { username: string; email: string; password: string; first_name?: string; last_name?: string }) =>
    client.post<User>('/auth/register/', data),

  logout: () => client.post('/auth/logout/'),

  me: () => client.get<User>('/auth/me/'),

  passwordReset: (email: string) =>
    client.post('/auth/password-reset/', { email }),

  passwordResetConfirm: (uidb64: string, token: string, password: string, password_confirm: string) =>
    client.post('/auth/password-reset/confirm/', { uidb64, token, password, password_confirm }),
};
