'use client'
// Screen 31: edit (pencil) and delete (trash) icons; delete opens the EXP132 popup and calls DELETE /api/prf/experience/:id.
import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Modal } from '@/app/components/ui'

const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
const PENCIL = 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'
const TRASH = 'M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v6M14 11v6'

const COPY = {
  delete: { title: 'Xoá trải nghiệm?', text: 'Trải nghiệm chưa có đặt chỗ. Xoá xong không hoàn tác được.', confirm: 'Xoá trải nghiệm' },
  archive: { title: 'Lưu trữ trải nghiệm?', text: 'Trải nghiệm đã có lịch sử đặt chỗ nên sẽ được lưu trữ và ẩn khỏi danh sách. Lịch sử đặt chỗ vẫn giữ nguyên.', confirm: 'Lưu trữ' },
  blocked: { title: 'Chưa thể xoá trải nghiệm', text: 'Trải nghiệm đang có đặt chỗ giữ chỗ hoặc đã chốt. Hãy xử lý các đặt chỗ đó trước.', confirm: '' },
} as const

export default function ExperienceRowActions({ providerId, experienceId, name, deletion }: { providerId: string; experienceId: string; name: string; deletion: 'blocked' | 'archive' | 'delete' }) {
  const router = useRouter()
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const copy = COPY[deletion]
  async function confirm() {
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/prf/experience/${experienceId}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Không thể xử lý.')
      setOpen(false); router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể xử lý.') } finally { setBusy(false) }
  }
  return <div className="pv3-xrow__actions">
    <Link className="pv3-iconbtn" href={`/provider/${providerId}/experiences/${experienceId}/edit`} aria-label={`Sửa ${name}`}><Icon d={PENCIL} /></Link>
    <button type="button" className="pv3-iconbtn pv3-iconbtn--danger" aria-label={`Xoá ${name}`} onClick={() => { setError(''); setOpen(true) }}><Icon d={TRASH} /></button>
    <Modal open={open} onClose={() => setOpen(false)} title={copy.title} tone="danger" closeDisabled={busy}
      actions={<>
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>{deletion === 'blocked' ? 'Đóng' : 'Giữ lại'}</Button>
        {deletion !== 'blocked' && <Button variant="danger" onClick={confirm} disabled={busy}>{busy ? 'Đang xử lý…' : copy.confirm}</Button>}
      </>}>
      <p><strong>{name}</strong></p><p>{copy.text}</p>{error && <p role="alert" className="pv3-error">{error}</p>}
    </Modal>
  </div>
}
