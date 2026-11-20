import type { AdminLoginDto, UserDto } from '../../types/api';
import http from "@/app/lib/http";
import { authAction } from '../../lib/auth-actions';

export const loginAdminApi = (username: string, password: string) =>
  authAction('admin', 'login', () => http.post<AdminLoginDto>(
    "/auth/admin/login",
    { username, password },
    {
      headers: { "x-auth-type": "admin" },
    },
  ));

export const logoutAdminApi = () =>
  authAction('admin', 'logout', () => http.post("/auth/admin/logout", {}, { headers: { "x-auth-type": "admin" } }));

export const getCurrentAdminApi = () =>
  http.get<{ data: UserDto }>("/users/admin/me", { headers: { "x-auth-type": "admin" } });
