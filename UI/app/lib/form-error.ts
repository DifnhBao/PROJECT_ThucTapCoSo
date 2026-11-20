import { ApiError, isRecord } from './api-contract';
const labels: Record<string, string> = { first_name: 'Tên', firstName: 'Tên', last_name: 'Họ', lastName: 'Họ', birthday: 'Ngày sinh', dateOfBirth: 'Ngày sinh', phone_number: 'Số điện thoại', phone: 'Số điện thoại', address: 'Địa chỉ', gender: 'Giới tính', name: 'Tên', title: 'Tên bài hát', username: 'Tên đăng nhập', password: 'Mật khẩu', email: 'Email', description: 'Mô tả', duration: 'Thời lượng', artist: 'Nghệ sĩ', genre: 'Thể loại' };
function fieldError(path: string, code: string) {
  const field = path.split('.').at(-1) ?? '';
  const message = ['too_big', 'too_long'].includes(code) ? 'Nội dung quá dài.' : ['too_small', 'required'].includes(code) ? 'Vui lòng nhập đủ thông tin.' : 'Giá trị không hợp lệ.';
  return `${labels[field] ?? 'Thông tin'}: ${message}`;
}
export function formError(error: unknown): string {
  if (error instanceof ApiError) return [error.message, ...error.details.map((d) => fieldError(d.path, d.code))].join(' · ');
  if (isRecord(error) && isRecord(error.response) && isRecord(error.response.data)) {
    const data = error.response.data;
    const details = Array.isArray(data.details) ? data.details.flatMap((d: unknown) => isRecord(d) && typeof d.path === 'string' && typeof d.code === 'string' ? [fieldError(d.path, d.code)] : []) : [];
    return [typeof data.message === 'string' ? data.message : 'Không thể lưu.', ...details].join(' · ');
  }
  return error instanceof Error ? error.message : 'Không thể lưu. Vui lòng thử lại.';
}
