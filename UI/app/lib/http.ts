import axios from "axios";

const http = axios.create({
  baseURL:
    (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") + "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default http;

// xử lí REFRESH TOKEN
let isRefreshing = false;
let failedQueue: {
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}[] = [];

const processQueue = (error: any) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(null);
  });
  failedQueue = [];
};

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalReq = error.config;

    if (
      error.response?.status === 401 &&
      !originalReq._retry &&
      !originalReq.url.includes("refresh-token")
    ) {
      // lấy type (user | admin)
      const authType = originalReq.headers["x-auth-type"] || "user";

      const refreshEndpoint =
        authType === "admin"
          ? "/auth/admin/refresh-token"
          : "/auth/refresh-token";

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => http(originalReq));
      }

      originalReq._retry = true;
      isRefreshing = true;

      try {
        await http.post(refreshEndpoint, null, {
          headers: {
            "x-auth-type": authType, //giữ context
          },
        });

        processQueue(null);
        return http(originalReq);
      } catch (err) {
        processQueue(err);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
