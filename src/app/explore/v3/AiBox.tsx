// "Ghép tour AI" block of mockup 01/21/03/04/23 (human decision 2026-11-18 #2). Tour Agency: the request and the
// suggestion chips open /ai-matching with the text filled in (`?prompt=`), never sent automatically.
// Guest: everything leads to /login; the Guest never calls AI.
import Link from 'next/link'
import { ArrowUp, Sparkles, WandSparkles } from 'lucide-react'

export default function AiBox({ agency, title, placeholder, chips }: { agency: boolean; title: string; placeholder: string; chips: string[] }) {
  const chipHref = (text: string) => agency ? `/ai-matching?prompt=${encodeURIComponent(text)}` : '/login'
  return <div className="v3-aibox" aria-label="Ghép tour AI" role="group">
    <div className="v3-aitop"><p className="v3-aititle">{title}</p>
      <span className="v3-aibrand"><span className="v3-dotm" aria-hidden="true"><WandSparkles /></span><span><b>Ghép tour AI</b> · Hanoi Artisan Bridge</span></span></div>
    <form className="v3-airow" action={agency ? '/ai-matching' : '/login'} method="get">
      <span className="v3-aiic" aria-hidden="true"><Sparkles /></span>
      <label className="v3-aiin"><span className="v3-sr">Yêu cầu của đoàn</span>
        <input name={agency ? 'prompt' : undefined} placeholder={placeholder} />
        <button type="submit" className={`v3-aisend${agency ? ' v3-aisend--on' : ''}`} aria-label="Gửi cho Ghép tour AI"><ArrowUp /></button></label>
    </form>
    {!agency && <p className="v3-ainote">Ghép tour AI dành cho tài khoản công ty lữ hành. Đăng nhập để bắt đầu.</p>}
    <p className="v3-aisub">Gợi ý yêu cầu</p>
    <div className="v3-aiqs">{chips.map(text => <Link key={text} className="v3-aiq" href={chipHref(text)}><Sparkles aria-hidden="true" />{text}</Link>)}</div>
    {!agency && <Link className="v3-aiprev" href="/login">Đăng nhập để dùng Ghép tour AI</Link>}
  </div>
}
