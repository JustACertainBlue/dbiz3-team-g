import './registration.css'
export default function RegistrationLayout({ children }: { children: React.ReactNode }) {
  return <main className="registration-shell"><p role="note">Đăng ký Agency. Email thật chưa được cấu hình; chế độ dev-outbox chỉ dành cho kiểm thử cục bộ.</p>{children}</main>
}
