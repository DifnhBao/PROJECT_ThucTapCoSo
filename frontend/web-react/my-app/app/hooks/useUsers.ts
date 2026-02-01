"use client";
import useSWR, { mutate } from "swr";
import { getUsers } from "@/app/utils/authApi";
import { deleteAccount } from "@/app/utils/accountApi";
import { User } from "../types/music";

interface UsersResponse {
  data: User[];
}

const fetcher = async (): Promise<User[]> => {
  const res = await getUsers();
  if (!res.ok) throw new Error("Không thể tải danh sách user");
  const result = await res.json();

  return result.data.map((item: any) => ({
    userId: item.user_id,
    username: item.username,
    email: item.email,
    role: item.role,
    activity_status: item.activity_status,
  }));
};

export function useUsers() {
  const { data, error, isLoading } = useSWR<User[]>("users", fetcher);

  const deleteUser = async (userId: number) => {
    const res = await deleteAccount(userId);
    const dataRes = await res.json();

    alert(dataRes.message);

    if (res.ok) {
      mutate("users");
    }
  };

  return {
    users: data ?? [],
    isLoading,
    error,
    deleteUser,
  };
}
