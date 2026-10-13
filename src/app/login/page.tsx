import Link from 'next/link';

export default function LoginPlaceholder() {
  return <main><h1>Cần đăng nhập</h1><p>Báo giá và Chat chỉ dành cho doanh nghiệp du lịch đã được phê duyệt.</p>
    <p className="muted">Chức năng đăng nhập đang được hoàn thiện.</p>
    <Link href="/explore">Quay lại Explore</Link></main>;
}
