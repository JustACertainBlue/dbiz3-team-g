import '../auth-v3/auth-v3.css'
// The note keeps the earlier statement about registration scope and email delivery (not in the mockup).
export default function RegistrationLayout({ children }: { children: React.ReactNode }) {
  return <main className="av3-reg-shell"><p role="note" className="av3-note">Chỉ công ty lữ hành được tự đăng ký. Tài khoản xưởng nghề do UBND xã cấp. Email thật chưa được cấu hình; chế độ dev-outbox chỉ dành cho kiểm thử cục bộ.</p>{children}</main>
}
