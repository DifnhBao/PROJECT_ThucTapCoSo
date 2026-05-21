import http from "@/app/lib/http";

export const getCurrentUserApi = () => http.get("/users/me");

export const uploadAvatarApi = (formData: FormData) =>
  http.post("/users/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
