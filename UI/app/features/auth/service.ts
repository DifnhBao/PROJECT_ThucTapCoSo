import { User } from "@/app/types/music";
import { loginApi, registerApi, logoutApi } from "./api";

interface AuthResponse {
  message: string;
  user?: User;
}

export const loginService = async (
  username: string,
  password: string,
): Promise<AuthResponse> => {
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
