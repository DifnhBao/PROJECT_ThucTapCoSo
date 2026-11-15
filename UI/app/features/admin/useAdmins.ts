"use client";
import { getAdmins } from "@/app/features/auth/authApi";
import { deleteAccount } from "@/app/features/user/accountApi";
import useSWR from "swr";
import { readApiResponse } from "../../lib/api-contract";
import { useAuthState } from "../../lib/use-auth-state";
import type { UserDto } from '../../types/api';
import { User } from "../../types/music";

// Fetcher dùng chung
const fetcher = async (): Promise<User[]> => {
  const res = await getAdmins();
  if (!res.ok) throw new Error("Không thể tải danh sách admin");

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

// Hook dùng chung
export function useAdmins() {
  const auth = useAuthState("admin");
  const key = auth.principal ? ["admin", auth.principal.userId, auth.epoch, "admins"] : null;
  const { data, error, isLoading, mutate } = useSWR<User[]>(key, fetcher);

  // Xóa admin
  const deleteAdmin = async (userId: number) => {
    try {
      const res = await deleteAccount(userId);

      let dataRes;
      try {
        dataRes = await readApiResponse<{ message?: string }>(res);
      } catch {
        dataRes = { message: "Không thể đọc phản hồi từ máy chủ." };
      }

      alert(dataRes.message || "Không có phản hồi từ server.");

      if (res.ok) {
        mutate(
          (admins) => admins?.filter((u) => u.userId !== userId),
          false,
        );
        mutate();
      }
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      alert("Không thể kết nối đến máy chủ.");
    }
  };

  return {
    admins: data ?? [],
    isLoading,
    error,
    deleteAdmin,
    refreshAdmins: () => mutate(),
  };
}
