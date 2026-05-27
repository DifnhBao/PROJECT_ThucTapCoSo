import {
  loginAdminApi,
  logoutAdminApi,
  getCurrentAdminApi,
//   registerAdminApi,
} from "./api";

export const loginAdminService = async (username: string, password: string) => {
  const res = await loginAdminApi(username, password);
  return res.data;
};

export const logoutAdminService = async () => {
  await logoutAdminApi();
};

export const getCurrentAdminService = async () => {
  const res = await getCurrentAdminApi();
  return res.data;
};


