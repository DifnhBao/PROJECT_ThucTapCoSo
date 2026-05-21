import { useRouter } from "next/navigation";
import { logoutAdminService } from "./service";
import { useAdminUser } from "@/app/features/admin/context/AdminUserContext";

export const useLogoutAdmin = () => {
  const { setAdmin } = useAdminUser();
  const router = useRouter();

  const logout = async () => {
    try {
      await logoutAdminService();
    } catch (error) {
      console.error(error);
    } finally {
      setAdmin(null);
    }

    router.replace("/administrator");
  };

  return { logout };
};
