export function validatePassword(password: string): string | null {
  if (!password) {
    return "Mật khẩu là bắt buộc";
  }

  if (password.length < 8) {
    return "Mật khẩu phải có ít nhất 8 ký tự";
  }

  if (!/[A-Z]/.test(password)) {
    return "Mật khẩu phải chứa ít nhất một chữ cái viết hoa";
  }

  if (!/[a-z]/.test(password)) {
    return "Mật khẩu phải chứa ít nhất một chữ cái viết thường";
  }

  if (!/\d/.test(password)) {
    return "Mật khẩu phải chứa ít nhất một chữ số";
  }

  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\\[\]~`]/.test(password)) {
    return "Mật khẩu phải chứa ít nhất một ký tự đặc biệt";
  }

  return null;
}
