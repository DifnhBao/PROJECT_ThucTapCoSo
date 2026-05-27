"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { getCurrentAdminService } from "@/app/features/admin/service";
import type { User } from "@/app/types/music";

interface AdminUserContextType {
  admin: User | null;
  setAdmin: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  checkAdmin: () => Promise<void>;
}

const AdminUserContext = createContext<AdminUserContextType | undefined>(
  undefined,
);

export const AdminUserProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [admin, setAdmin] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAdmin = async () => {
    console.log("🚀 checkAdmin START");
    setLoading(true);
    try {
      const data = await getCurrentAdminService();
      console.log("✅ API SUCCESS:", data);
      setAdmin(data.data);
    } catch (err) {
      console.log("❌ API ERROR:", err);
      setAdmin(null);
    } finally {
      console.log("🏁 FINALLY - SET LOADING FALSE");
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  return (
    <AdminUserContext.Provider value={{ admin, setAdmin, loading, checkAdmin }}>
      {children}
    </AdminUserContext.Provider>
  );
};

export const useAdminUser = (): AdminUserContextType => {
  const context = useContext(AdminUserContext);
  if (!context) {
    throw new Error("useAdminUser phải được dùng trong AdminUserProvider");
  }
  return context;
};
