import { URL } from "./authApi";

// API refresh access token admin
export async function refreshTokenByAdmin() {
  return await fetch(URL + "/auth/admin/refresh-token", {
    method: "POST",
    credentials: "include", // gửi cookie kèm theo
  });
}

// API refresh access token user
export async function refreshTokenByUser() {
  return await fetch(URL + "/auth/refresh-token", {
    method: "POST",
    credentials: "include", // gửi cookie kèm theo
  });
}

// Fetch API bất kì cần access token
type Role = "admin" | "user";

export async function fetchWithAutoRefresh(
  url: string,
  options: RequestInit = {},
  context: { role: Role },
  retry: boolean = true
) {
  let res = await fetch(url, {
    ...options,
    credentials: "include",
  });

  // Access token hết hạn
  if (res.status === 401 && retry) {
    console.warn(`[${context.role}] Access token hết hạn, đang refresh...`);

    const refreshRes =
      context.role === "admin"
        ? await refreshTokenByAdmin()
        : await refreshTokenByUser();

    if (!refreshRes.ok) {
      console.error("Refresh token thất bại, cần đăng nhập lại");
      throw new Error("UNAUTHORIZED");
    }

    // Retry đúng 1 lần
    res = await fetch(url, {
      ...options,
      credentials: "include",
    });
  }

  return res;
}

export const adminFetch = (url: string, options?: RequestInit) =>
  fetchWithAutoRefresh(url, options, { role: "admin" });

export const userFetch = (url: string, options?: RequestInit) =>
  fetchWithAutoRefresh(url, options, { role: "user" });
