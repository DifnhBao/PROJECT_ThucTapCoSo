import axios from "axios";

const http = axios.create({
  baseURL:
    (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") + "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

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

// bắt response
http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalReq = error.config;

    if (
      error.response?.status === 401 &&
      !originalReq._retry &&
      !originalReq.url.includes("/auth/refresh-token")
    ) {
      // Nếu đang refresh → queue lại
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => http(originalReq));
      }

      originalReq._retry = true;
      isRefreshing = true;

      try {
        await http.post("/auth/refresh-token");

        processQueue(null);
        return http(originalReq);
      } catch (err) {
        processQueue(err);

        // window.location.href = "/explore";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default http;
