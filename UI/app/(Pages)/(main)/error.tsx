'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section role="alert"><h1>Không thể mở trang</h1><button onClick={reset}>Thử lại</button><a href="/Home">Về trang chủ</a></section>;
}
