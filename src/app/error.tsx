'use client'
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section role="alert" style={{maxWidth:760,margin:'40px auto',padding:28,background:'#fffdf8',border:'1px solid #ded8cb',borderRadius:16}}><h1>Không thể tải nội dung</h1><p>Vui lòng thử lại. Nếu lỗi tiếp tục, quay về không gian làm việc.</p><button onClick={reset}>Thử lại</button> <a href="/">Về không gian làm việc</a></section>
}
