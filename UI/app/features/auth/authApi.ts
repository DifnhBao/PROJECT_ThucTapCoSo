import {
adminFetch
} from "../../utils/refreshToken";

export const URL =
  "/api";

export async function getUsers() {
  return await adminFetch(URL + "/users", { method: "GET" });
}

export async function getAdmins() {
  return await adminFetch(URL + "/users/admins", { method: "GET" });
}

export async function addNewAdmin(
  username: string,
  email: string,
  password: string,
) {
  return await adminFetch(URL + "/users/admin/new", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
}
