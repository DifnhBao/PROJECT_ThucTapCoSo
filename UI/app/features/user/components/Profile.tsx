"use client";

import styles from "@/app/features/user/components/Profile.module.css";
import { useProfileForm } from "../../../hooks/useProfileForm";
import { UserProfileData } from "../../../types/music";
import { formatDateForInput } from "../../../utils/dateHelper";

const Profile = ({
  initialData,
  mode = "user",
  userId,
}: {
  initialData?: UserProfileData;
  mode?: "user" | "admin";
  userId?: number;
}) => {
  const {
    formData,
    // note,
    existingProfile,
    handleChange,
    handleReset,
    handleSubmit,
  } = useProfileForm(initialData, mode, userId);

  return (
    <div className={styles.profileCard}>
      <h1 className={styles.title}>
        {existingProfile
          ? "Chỉnh sửa thông tin cá nhân"
          : "Nhập thông tin cá nhân"}
      </h1>

      <p className={styles.lead}>
        {existingProfile ? "" : "Vui lòng điền đầy đủ thông tin."}
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.nameRow}>
          <div className={`${styles.nameField} ${styles.first}`}>
            <label className={styles.label}>First Name</label>
            <input
              name="firstName"
              placeholder="Nguyen Van"
              className={styles.input}
              value={formData.firstName}
              onChange={handleChange}
            />
          </div>

          <div className={`${styles.nameField} ${styles.last}`}>
            <label className={styles.label}>Last Name</label>
            <input
              name="lastName"
              placeholder="A"
              className={styles.input}
              value={formData.lastName}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Giới tính</label>
          <div className={styles.radioGroup}>
            {["male", "female", "other"].map((g) => (
              <label key={g} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={formData.gender === g}
                  onChange={handleChange}
                  className={styles.radio}
                />
                {g}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Năm sinh</label>
          <input
            type="date"
            name="dateOfBirth"
            className={styles.input}
            value={formatDateForInput(formData.dateOfBirth)}
            onChange={handleChange}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Số điện thoại</label>
          <input
            type="tel"
            name="phone"
            placeholder="0123456789"
            className={styles.input}
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Địa chỉ</label>
          <textarea
            name="address"
            placeholder="97 Man Thien, Tang Nhon Phu, Ho Chi Minh City"
            className={styles.textarea}
            value={formData.address}
            onChange={handleChange}
          />
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.secondary}`}
            onClick={handleReset}
          >
            Xóa
          </button>

          <button type="submit" className={`${styles.btn} ${styles.primary}`}>
            {existingProfile ? "Cập nhật" : "Gửi"}
          </button>
        </div>

        {/* <p className={styles.note}>{note}</p> */}
      </form>
    </div>
  );
};

export default Profile;
