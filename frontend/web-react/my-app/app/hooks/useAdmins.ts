"use client";

import useSWR, { mutate } from "swr";
import { getAdmins, AcceptOrReject } from "@/app/utils/authApi";
import { deleteAccount } from "@/app/utils/accountApi";
import { User } from "../types/music";

// Fetcher dùng chung
const fetcher = async (): Promise<User[]> => {
  const res = await getAdmins();
  if (!res.ok) throw new Error("Không thể tải danh sách admin");

  const result = await res.json();

  return result.data.map((item: any) => ({
    userId: item.user_id,
    username: item.username,
    email: item.email,
    role: item.role,
    activity_status: item.activity_status,
    account_status: item.is_active,
  }));
};

// Hook dùng chung
export function useAdmins() {
  const { data, error, isLoading } = useSWR<User[]>("admins", fetcher);

  // Cập nhật trạng thái admin
  const updateAdminStatus = async (id: number, status: string) => {
    try {
      const res = await AcceptOrReject(id, status);
      const dataRes = await res.json();

      alert(dataRes.message);

      if (res.ok) {
        // Optimistic update
        mutate<User[]>(
          "admins",
          (admins) =>
            admins?.map((u) =>
              u.userId === id ? { ...u, activity_status: status } : u
            ),
          false
        );

        // Revalidate
        mutate("admins");
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái:", error);
      alert("Lỗi hệ thống khi cập nhật trạng thái.");
    }
  };

  // Xóa admin
  const deleteAdmin = async (userId: number) => {
    try {
      const res = await deleteAccount(userId);

      let dataRes;
      try {
        dataRes = await res.json();
      } catch {
        dataRes = { message: "Không thể đọc phản hồi từ máy chủ." };
      }

      alert(dataRes.message || "Không có phản hồi từ server.");

      if (res.ok) {
        mutate<User[]>(
          "admins",
          (admins) => admins?.filter((u) => u.userId !== userId),
          false
        );
        mutate("admins");
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
    updateAdminStatus,
    deleteAdmin,
    refreshAdmins: () => mutate("admins"),
  };
}
