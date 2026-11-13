"use client";
import { useModal } from "@/app/context/ModalContext";
import { useAdminUser } from "@/app/features/admin/context/AdminUserContext";
import { useAdmins } from "@/app/features/admin/useAdmins";
import styles from "@/app/styles/AdminPage/ManageAdmin.module.css";
import stylesUser from "@/app/styles/AdminPage/ManageUser.module.css";

export default function ManageAdmin() {
  const { openModal } = useModal();
  const { admin: actor } = useAdminUser();
  const { admins, isLoading, error, deleteAdmin, refreshAdmins } =
    useAdmins();

  if (isLoading) return <p>Đang tải...</p>;
  if (error) return <p>Lỗi tải danh sách admin!</p>;
  if (!admins || admins.length === 0) return null;

  return (
    <div id="admins" className={stylesUser.section}>
      <div>
        {actor?.role === "super_admin" && <button
          style={{ width: "fit-content" }}
          className={stylesUser.add}
          onClick={() => openModal("add-new-admin", { onCreated: refreshAdmins })}
        >
          <i className="fa-solid fa-plus"></i> Add Admin
        </button>}
      </div>

      <div className={stylesUser.table}>
        <div className={stylesUser.tableHead}>
          <div>ID</div>
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Status</div>
          <div>Option</div>
        </div>
        <div className="table_row">
          {admins.map((admin, index) => (
            <div key={admin.userId} className={stylesUser.row}>
              <div>{index + 1}</div>
              <div>{admin.username}</div>
              <div>{admin.email}</div>
              <div>{admin.role}</div>
              <div className={`${styles.status} ${styles.active}`}>actived</div>
              <div className={stylesUser.rowOption}>
                {(actor?.userId === admin.userId || (actor?.role === "super_admin" && admin.role === "admin")) && <button
                  className={stylesUser.edit}
                  onClick={() => openModal("reset-admin-password", admin)}
                >
                  Edit
                </button>}
                {actor?.role === "super_admin" && admin.role === "admin" && <button
                  className={stylesUser.delete}
                  onClick={() => deleteAdmin(admin.userId)}
                >
                  Delete
                </button>}

                {/* </> */}
                {/* )} */}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
