import type { LoginDto } from "../../types/api";
import { loginApi,logoutApi,registerApi } from "./api";

export const loginService = async (
  username: string,
  password: string,
): Promise<LoginDto> => {
  const res = await loginApi(username, password);
  return res.data;
};

export const registerService = async (
  username: string,
  email: string,
  password: string,
) => {
  const res = await registerApi(username, email, password);
  return res.data;
};

export const logoutService = async () => {
  await logoutApi();
};
