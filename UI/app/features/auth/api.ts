import http from "@/app/lib/axios";

export const loginApi = (username: string, password: string) =>
  http.post("/auth/login", { username, password });

export const registerApi = (
  username: string,
  email: string,
  password: string,
) => http.post("/auth/register", { username, email, password });

export const logoutApi = () => http.post("/auth/logout");
