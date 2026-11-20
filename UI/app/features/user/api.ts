import http from "@/app/lib/http";
import { uploadKey } from '../../lib/upload-key';
import type { UserDto } from '../../types/api';

export const getCurrentUserApi = () => http.get<{ data: UserDto; message?: string }>("/users/me");

export const uploadAvatarApi = async (formData: FormData) => {
  const attempt = await uploadKey(formData, 'avatar');
  const response = await http.post('/users/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data', 'Idempotency-Key': attempt.key } });
  attempt.done();
  return response;
};
