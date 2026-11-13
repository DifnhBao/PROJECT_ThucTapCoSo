import { getUsers } from "@/app/features/auth/authApi";
import { deleteAccount } from "@/app/features/user/accountApi";
import useSWR from "swr";
import { readApiResponse } from "../../lib/api-contract";
import { useAuthState } from "../../lib/use-auth-state";
import type { UserDto } from '../../types/api';
import { User } from "../../types/music";


const fetcher = async (): Promise<User[]> => {
  const res = await getUsers();
  if (!res.ok) throw new Error("Không thể tải danh sách user");
  const result = await readApiResponse<{ data: UserDto[] }>(res);

  return result.data.map((item) => ({
    userId: item.user_id,
    username: item.username,
    email: item.email,
    role: item.role,
    actStatus: item.activity_status ?? "offline",
    isActive: item.is_active ?? false,
    avatar: item.avatar ?? "",
  }));
};

export function useUsers() {
  const auth = useAuthState("admin");
  const key = auth.principal ? ["admin", auth.principal.userId, auth.epoch, "users"] : null;
  const { data, error, isLoading, mutate } = useSWR<User[]>(key, fetcher);

  const deleteUser = async (userId: number) => {
    const res = await deleteAccount(userId);
    const dataRes = await readApiResponse<{ message?: string }>(res);

    alert(dataRes.message);

    if (res.ok) {
      mutate();
    }
  };

  return {
    users: data ?? [],
    isLoading,
    error,
    deleteUser,
  };
}
