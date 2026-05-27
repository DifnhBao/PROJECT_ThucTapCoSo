import { useRouter } from "next/navigation";
import { logoutService } from "./service";
import { useUser } from "@/app/features/user/context/UserContext";

export const useLogout = () => {
  const { setUser } = useUser();
  const router = useRouter();

  const logout = async () => {
    try {
      await logoutService();
    } catch (error) {
      console.error("Logout API lỗi:", error);
    } finally {
      setUser(null);
    }

    router.refresh();

    router.push("/Home");
  };

  return { logout };
};
