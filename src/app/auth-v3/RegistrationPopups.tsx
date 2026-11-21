'use client'

// Screens 18a, 18b, 18c, 18d (png/18a–18d): the registration status popups, built on the shared Modal.
// 18a is wired on /register/status. 18b, 18c and 18d are complete components, but no API exposes the reviewer's
// request, reason or time to a signed-out applicant yet, so no page opens them (see the branch draft).
import React, { useState } from 'react'
import { FileWarning, Home, X } from 'lucide-react'
import Modal from '../components/ui/Modal'
import { buttonClass } from '../components/ui/Button'
import './auth-v3.css'

const Check = () => <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>

function Rows({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return <dl className="av3-rows">{rows.filter(([, value]) => value !== '' && value != null).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}

export type SubmittedInfo = { code?: string; company?: string; email?: string; sentAt?: string }
/** 18a: registration sent. */
export function SubmittedPopup({ open, onClose, info }: { open: boolean; onClose: () => void; info: SubmittedInfo }) {
  return <Modal open={open} onClose={onClose} width={560} title="Đã gửi hồ sơ đăng ký thành công" icon={<span className="av3-pop-icon av3-pop-icon--solid"><Check /></span>}>
    <p className="av3-pop-lead">Email của bạn đã được xác minh. Sở Du lịch Hà Nội sẽ kiểm tra hồ sơ, thường trong 2 ngày làm việc. Kết quả sẽ gửi về email đăng nhập. Khi đăng nhập bằng email này, bạn cũng xem được trạng thái hồ sơ.</p>
    <Rows rows={[['Mã hồ sơ', info.code ?? ''], ['Công ty', info.company ?? ''], ['Email đăng nhập', info.email ?? ''], ['Gửi lúc', info.sentAt ?? ''], ['Trạng thái', <span key="s" className="av3-warn-text">Chờ Sở Du lịch duyệt</span>]]} />
    <p className="av3-pop-note av3-pop-note--green">Trong lúc chờ duyệt, bạn vẫn xem được các trải nghiệm nhưng chưa đặt chỗ được.</p>
  </Modal>
}

export type ReviewNote = { field?: string; message: string; by?: string; at?: string }
/** 18b: documents must be supplemented. */
export function ReviseDocsPopup({ open, onClose, company, note, reviseHref }: { open: boolean; onClose: () => void; company?: string; note: ReviewNote; reviseHref?: string }) {
  return <Modal open={open} onClose={onClose} width={560} title="Hồ sơ cần bổ sung giấy tờ" icon={<span className="av3-pop-icon av3-pop-icon--danger"><FileWarning size={30} /></span>}
    actions={reviseHref ? <a className={buttonClass('primary')} href={reviseHref}>Bổ sung giấy tờ</a> : undefined}>
    <p className="av3-pop-lead">Sở Du lịch Hà Nội đã xem hồ sơ{company ? ` của ${company}` : ''} và cần bạn bổ sung trước khi duyệt.</p>
    <div className="av3-pop-box av3-pop-box--danger">
      <h3>Cần bổ sung</h3>
      {note.field && <p><strong>{note.field}</strong>: tải lại bản rõ hơn.</p>}
      <p className="av3-pop-quote">“{note.message}”</p>
      <small>{[note.by ?? 'Sở Du lịch Hà Nội', note.at].filter(Boolean).join(' · ')}</small>
    </div>
    {!reviseHref && <p className="av3-pop-lead av3-pop-lead--sm">Hãy mở đường dẫn bổ sung hồ sơ mà Sở Du lịch đã gửi qua email.</p>}
  </Modal>
}

export type ContactInfo = { code?: string; email: string; phone: string; hours: string }
/** 18d: contact the Department of Tourism. */
export function ContactDepartmentPopup({ open, onClose, info }: { open: boolean; onClose: () => void; info: ContactInfo }) {
  return <Modal open={open} onClose={onClose} width={520} title="Liên hệ Sở Du lịch Hà Nội" icon={<span className="av3-pop-icon av3-pop-icon--green"><Home size={28} /></span>}
    actions={<a className={buttonClass('primary')} href={`mailto:${info.email}${info.code ? `?subject=${encodeURIComponent(`Hồ sơ ${info.code}`)}` : ''}`}>Gửi email</a>}>
    <p className="av3-pop-lead">Khi liên hệ, hãy ghi kèm mã hồ sơ để được hỗ trợ nhanh hơn.</p>
    <Rows rows={[['Mã hồ sơ', info.code ?? ''], ['Email hỗ trợ', info.email], ['Điện thoại', info.phone], ['Giờ làm việc', info.hours]]} />
  </Modal>
}

/** 18c: registration not approved; opens 18d from "Liên hệ Sở Du lịch". */
export function RejectedPopup({ open, onClose, company, note, reviseHref, contact }: { open: boolean; onClose: () => void; company?: string; note: ReviewNote; reviseHref?: string; contact?: ContactInfo | null }) {
  const [contactOpen, setContactOpen] = useState(false)
  return <>
    <Modal open={open && !contactOpen} onClose={onClose} width={560} title="Hồ sơ đăng ký chưa được duyệt" icon={<span className="av3-pop-icon av3-pop-icon--solid av3-pop-icon--danger-solid"><X size={30} strokeWidth={2.8} /></span>}
      actions={<>{contact && <button type="button" className={buttonClass(reviseHref ? 'secondary' : 'primary')} onClick={() => setContactOpen(true)}>Liên hệ Sở Du lịch</button>}{reviseHref && <a className={buttonClass('primary')} href={reviseHref}>Sửa và gửi lại hồ sơ</a>}</>}>
      <p className="av3-pop-lead">Sở Du lịch Hà Nội không duyệt hồ sơ{company ? ` của ${company}` : ''}. Tài khoản chưa dùng được để đặt trải nghiệm.</p>
      <div className="av3-pop-box">
        <h3>Lý do</h3>
        <p className="av3-pop-quote">“{note.message}”</p>
        <small>{[note.by ?? 'Sở Du lịch Hà Nội', note.at].filter(Boolean).join(' · ')}</small>
      </div>
      <p className="av3-pop-lead av3-pop-lead--sm">{reviseHref ? 'Bạn có thể sửa thông tin theo lý do trên rồi gửi lại hồ sơ. Các thông tin khác đã nhập vẫn được giữ. ' : ''}{contact ? 'Nếu cho rằng có nhầm lẫn, hãy liên hệ Sở Du lịch Hà Nội.' : ''}</p>
    </Modal>
    {contact && <ContactDepartmentPopup open={open && contactOpen} onClose={() => setContactOpen(false)} info={contact} />}
  </>
}
