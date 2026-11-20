import type { LoginDto, MessageDto } from '../../types/api';
import http from "@/app/lib/http";
import { authAction } from '../../lib/auth-actions';

export const loginApi = (username: string, password: string) =>
  authAction('user', 'login', () => http.post<LoginDto>("/auth/login", { username, password }));

export const registerApi = (
  username: string,
  email: string,
  password: string,
) => http.post<MessageDto>("/auth/register", { username, email, password });

export const logoutApi = () => authAction('user', 'logout', () => http.post<MessageDto>('/auth/logout', {}));
