'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ProviderChatAction({ experienceId, choices=[] }: { experienceId?: string; choices?:Array<{id:string;name:string}> }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [selected,setSelected]=useState(experienceId || (choices.length===1?choices[0].id:''))

  async function openChat() {
    if (!selected) { setError('Chọn trải nghiệm để giữ đúng ngữ cảnh trao đổi.'); return }
    setBusy(true)
    setError('')
    try {
    const response = await fetch('/api/demo/handoff', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'chat', experience_id: selected, source_context: 'Detail Page', chat_source: 'Provider Profile' }), // spec-EXP #33, spec-IAC #19
    })
    const body = await response.json()
    if (!response.ok) {
      setError(body.error?.message || 'Không thể mở Chat')
      setBusy(false)
      return
    }
    router.push(`/messages?chat_session_id=${encodeURIComponent(body.data.chat_session_id)}`)
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  if(!experienceId&&!choices.length)return <p>Provider chưa có trải nghiệm công khai để mở trao đổi. Vui lòng quay lại khi danh mục được cập nhật.</p>
  return <>{choices.length>0&&<label>Trải nghiệm muốn trao đổi<select value={selected} onChange={event=>setSelected(event.target.value)} disabled={busy}><option value="">Chọn trải nghiệm</option>{choices.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<button className="button" disabled={busy||!selected} onClick={openChat}>{busy ? 'Đang mở Chat…' : 'Chat với Provider'}</button>{error && <small role="alert">{error}</small>}</>
}
