'use client';
import Link from 'next/link';
import { ApiError, isRecord } from '../../lib/api-contract';
export default function ResourceState({ error, retry }: { error?: unknown; retry?: () => void }) {
  if (!error) return <p role="status">Đang tải…</p>;
  const status = error instanceof ApiError ? error.status : isRecord(error) && isRecord(error.response) && typeof error.response.status === 'number' ? error.response.status : 0;
  return <section role="alert"><p>{status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : status === 403 ? 'Bạn không có quyền xem nội dung này.' : status === 404 ? 'Không tìm thấy nội dung hoặc nội dung không được công khai.' : 'Không thể tải dữ liệu. Vui lòng thử lại.'}</p>
    {status === 401 ? <Link href="/login">Đăng nhập</Link> : ![403,404].includes(status) && retry ? <button onClick={retry}>Thử lại</button> : null}</section>;
}
