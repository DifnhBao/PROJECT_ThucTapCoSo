import { fetchWithAutoRefresh } from "./refreshToken";
import { adminFetch, userFetch } from "./refreshToken";
import { URL } from "./authApi";

// admin xóa tài khoản
export async function deleteAccount(id: number) {
  return await adminFetch(URL + `/users/${id}`, {
    method: "DELETE",
  });
}

// Người dùng thêm mới profile
export async function addNewProfile(formData: object) {
  return await userFetch(URL + "/acc/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
}

// cập nhật thông tin người dùng
export async function updateProfile(formData: object) {
  return await userFetch(URL + "/users/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
}

// lấy thông tin người dùng bằng id
export async function getUserProfile(userId: number) {
  return await adminFetch(URL + `/users/profile/${userId}`, {
    method: "GET",
  });
}

// admin thay đổi thông tin người dùng
export async function adminUpdateUserProfile(userId: number, formData: object) {
  return await adminFetch(URL + `/users/profile/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
}

// thay đổi mật khẩu
export async function changePassword(oldPassword: string, newPassword: string) {
  return await userFetch(URL + "/users/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

export async function changeAdminPassword(
  adminId: number,
  newPassword: string
) {
  return await adminFetch(URL + `/users/${adminId}/reset-password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword }),
  });
}
