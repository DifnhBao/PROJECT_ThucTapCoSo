"use client";

import stylesUser from "@/app/styles/AdminPage/ManageUser.module.css";
import styles from "@/app/styles/AdminPage/ManageAdmin.module.css";
import { useModal } from "@/app/context/ModalContext";
import { useAdmins } from "@/app/hooks/useAdmins";
import type { User } from "@/app/types/music";

export default function ManageAdmin() {
  const { openModal } = useModal();
  const { admins, isLoading, error, updateAdminStatus, deleteAdmin } =
    useAdmins();

  if (isLoading) return <p>Đang tải...</p>;
  if (error) return <p>Lỗi tải danh sách admin!</p>;
  if (!admins || admins.length === 0) return null;
  console.log("admins: ", admins);

  return (
    <div id="admins" className={stylesUser.section}>
      <div>
        <button
          style={{ width: "fit-content" }}
          className={stylesUser.add}
          onClick={() => openModal("add-new-admin")}
        >
          <i className="fa-solid fa-plus"></i> Add Admin
        </button>
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
                <button
                  className={stylesUser.edit}
                  onClick={() => openModal("reset-admin-password", admin)}
                >
                  Edit
                </button>
                <button
                  className={stylesUser.delete}
                  onClick={() => deleteAdmin(admin.userId)}
                >
                  Delete
                </button>
                {/* {admin.account_status === "pending" ? (
                  <>
                    <button
                      className={stylesUser.edit}
                      onClick={() => updateAdminStatus(admin.userId, "accept")}
                    >
                      Accept
                    </button>
                    <button
                      className={stylesUser.delete}
                      onClick={() => updateAdminStatus(admin.userId, "reject")}
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={stylesUser.edit}
                      onClick={() => openModal("reset-admin-password", admin)}
                    >
                      Edit
                    </button>
                    <button
                      className={stylesUser.delete}
                      onClick={() => deleteAdmin(admin.userId)}
                    >
                      Delete
                    </button> */}
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
