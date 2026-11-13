import { adminFetch,userFetch } from "../../utils/refreshToken";
import { URL } from "../auth/authApi";

// admin xóa tài khoản
export async function deleteAccount(id: number) {
  return await adminFetch(URL + `/users/${id}`, {
    method: "DELETE",
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
  newPassword: string,
) {
  return await adminFetch(URL + `/users/${adminId}/reset-password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword }),
  });
}

export async function changeOwnAdminPassword(oldPassword: string, newPassword: string) {
  return await adminFetch(URL + "/users/admin/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

