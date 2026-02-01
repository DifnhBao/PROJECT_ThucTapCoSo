"use client";

import { useProfileForm } from "../hooks/useProfileForm";
import { UserProfileData } from "../types/music";
import { formatDateForInput } from "../utils/dateHelper";
import "@/app/styles/Profile.css";

const Profile = ({
  initialData,
  mode = "user",
  userId,
}: {
  initialData: UserProfileData;
  mode?: "user" | "admin";
  userId?: number;
}) => {
  const {
    formData,
    note,
    existingProfile,
    handleChange,
    handleReset,
    handleSubmit,
  } = useProfileForm(initialData, mode, userId);

  return (
    <div className="profile_card" role="region" aria-labelledby="form-title">
      <h1 id="form-title">
        {existingProfile
          ? "Chỉnh sửa thông tin cá nhân"
          : "Nhập thông tin cá nhân"}
      </h1>
      <p className="lead">
        {existingProfile ? "" : "Vui lòng điền đầy đủ thông tin."}
      </p>

      <form id="personalForm" noValidate onSubmit={handleSubmit}>
        {/* Họ và tên */}
        <div className="name-row">
          <div className="name-field first">
            <label htmlFor="fullName">
              First Name <span aria-hidden="true">*</span>
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="Nguyễn Văn"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="name-field last">
            <label htmlFor="lastName">
              Last Name <span aria-hidden="true">*</span>
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="A"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Giới tính */}
        <div className="field">
          <label>
            Giới tính <span aria-hidden="true">*</span>
          </label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="gender"
                value="male"
                checked={formData.gender === "male"}
                onChange={handleChange}
                required
              />{" "}
              Nam
            </label>
            <label>
              <input
                type="radio"
                name="gender"
                value="female"
                checked={formData.gender === "female"}
                onChange={handleChange}
              />{" "}
              Nữ
            </label>
            <label>
              <input
                type="radio"
                name="gender"
                value="other"
                checked={formData.gender === "other"}
                onChange={handleChange}
              />{" "}
              Khác
            </label>
          </div>
        </div>

        {/* Năm sinh */}
        <div className="field">
          <label htmlFor="birthYear">
            Năm sinh <span aria-hidden="true">*</span>
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={formatDateForInput(formData.dateOfBirth)}
            onChange={handleChange}
            required
          />
        </div>

        {/* Số điện thoại */}
        <div className="field">
          <label htmlFor="phone">
            Số điện thoại <span aria-hidden="true">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="0912xxxxxx"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>

        {/* Địa chỉ */}
        <div className="field">
          <label htmlFor="address">Địa chỉ</label>
          <textarea
            id="address"
            name="address"
            placeholder="Ví dụ: 123 Đường ABC, Quận X, TP"
            value={formData.address}
            onChange={handleChange}
          ></textarea>
        </div>

        {/* Nút hành động */}
        <div className="actions">
          <button type="button" className="btn-secondary" onClick={handleReset}>
            Xóa
          </button>
          <button type="submit" className="btn-primary">
            {existingProfile ? "Cập nhật thông tin" : "Gửi thông tin"}
          </button>
        </div>

        <p className="note" id="formNote" aria-live="polite">
          {note}
        </p>
      </form>
    </div>
  );
};

export default Profile;
