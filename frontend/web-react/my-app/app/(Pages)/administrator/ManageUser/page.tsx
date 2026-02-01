"use client";

import styles from "@/app/styles/AdminPage/ManageUser.module.css";
import { useUsers } from "@/app/hooks/useUsers";
import { useModal } from "@/app/context/ModalContext";
import type { User } from "@/app/types/music";

export default function ManageUser() {
  const { users, isLoading, error, deleteUser } = useUsers();
  const { openModal } = useModal();

  if (isLoading) return <p>Đang tải...</p>;
  if (error) return <p>Lỗi tải danh sách user!</p>;
  if (!users || users.length === 0) return null;

  // console.log("users: ", users);

  return (
    <div id="users" className={styles.section}>
      {/* <div>
        <button style={{ width: "fit-content" }} className={styles.add}>
          <i className="fa-solid fa-plus"></i> Add User
        </button>
      </div> */}

      <div className={styles.table}>
        <div className={styles.tableHead}>
          <div>ID</div>
          <div>Username</div>
          <div>Email</div>
          <div>Role</div>
          <div>Status</div>
          <div>Options</div>
        </div>

        <div className="table_row">
          {users.map((user, index) => (
            <div key={user.userId} className={styles.row}>
              <div>{index + 1}</div>
              <div>{user.username}</div>
              <div>{user.email}</div>
              <div>{user.role}</div>

              <div>
                <span
                  className={
                    user.activity_status === "online"
                      ? `${styles.status} ${styles.active}`
                      : `${styles.status} ${styles.inactive}`
                  }
                >
                  {user.activity_status}
                </span>
              </div>

              <div className={styles.rowOption}>
                <button
                  className={styles.edit}
                  onClick={() => openModal("edit-user-profile", user)}
                >
                  Edit
                </button>

                <button
                  className={styles.delete}
                  onClick={() => deleteUser(user.userId)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          <div className={styles.row}>
            <div>0</div>
            <div>Huỳnh Đình Thạch</div>
            <div>dinhthach11@gmail.com</div>
            <div>User</div>
            <div>
              <span className={`${styles.status} ${styles.inactive}`}>
                offline
              </span>
            </div>
            <div className={styles.rowOption}>
              <button className={styles.edit}>Edit</button>
              <button className={styles.delete}>Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
