import { getCurrentUserApi,uploadAvatarApi } from "./api";

export const getCurrentUserService = async () => {
  const res = await getCurrentUserApi();
  return res.data;
};

export const uploadAvatarService = async (formData: FormData) => {
  const res = await uploadAvatarApi(formData);
  return res.data;
};
