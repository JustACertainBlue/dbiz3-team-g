'use client'
// "Giá & lịch trống" table of mockup 04/23: free fixed slots of the chosen day; the radio choice is shown in the side
// panel. "Gửi yêu cầu đặt chỗ" opens the request form (ui/v3-booking) and then the chat with the request card.
import React, { useState } from 'react'
import Link from 'next/link'
import { Check, Info, Lock, Users } from 'lucide-react'
import type { SlotRow } from '@/lib/explore/v3-detail'
import type { PriceView } from '@/lib/explore/v3-search'
import RequestButton from '../../v3/RequestButton'

const vnd = (value: number) => `${value.toLocaleString('vi-VN')} ₫`

export default function SlotTable({ experienceId, date, name, slots, guests, max, price, perGuest, guide, cancel, isAgency, dateLong, week }: {
  experienceId: string; date: string; name: string; slots: SlotRow[]; guests: number | null; max: number; price: PriceView; perGuest: string[]; guide: boolean; cancel: string
  isAgency: boolean; dateLong: string; week: string
}) {
  const [chosen, setChosen] = useState(slots[0]?.id ?? '')
  const selected = slots.find(slot => slot.id === chosen)
  return <>
    <p className="v3d-slotday">{dateLong ? `Các ca còn trống ngày ${dateLong}` : 'Chọn ngày để xem các ca còn trống'}</p>
    {dateLong && !slots.length && <p className="v3-empty">Không còn ca trống trong ngày này.</p>}
    {slots.length > 0 && <div className="v3d-avwrap">
      <div className="v3d-avscroll"><table className="v3d-avt">
        <thead><tr><th scope="col">Ca trải nghiệm</th><th scope="col">Số khách</th><th scope="col" className="v3d-pc">Giá cho đoàn</th><th scope="col">Bao gồm &amp; chính sách</th><th scope="col">Chọn</th></tr></thead>
        <tbody>{slots.map(slot => <tr key={slot.id} className={slot.id === chosen ? 'is-sel' : undefined}>
          <td><a href="#tong-quan" className="v3d-slotname">{name} · {slot.label}</a><p className="v3d-slottime">{slot.time} · {slot.minutes} phút</p>
            {slot.fit && <p className="v3d-fit">{slot.fit}</p>}
            {perGuest.length > 0 && <div>{perGuest.map(item => <span key={item} className="v3-mini">{item}</span>)}</div>}</td>
          <td>{guests ? <span className="v3d-pax"><Users aria-hidden="true" />× {guests}</span> : null}<p className="v3-cap">Tối đa {max}</p></td>
          <td>{price.kind === 'group'
            ? <>{price.old !== null && <span className="v3r__old">{vnd(price.old)}</span>}<p className="v3d-tprice">{vnd(price.total)}</p>
                {guide && <p className="v3-cap">Đã gồm vật liệu và người hướng dẫn</p>}{price.old !== null && <span className="v3r__disc">Tiết kiệm {price.note.replace(/\D+/g, '')}%</span>}</>
            : price.kind === 'locked'
              ? <><p className="v3-cap">Giá dành cho công ty lữ hành</p><Link href="/login" className="v3r__lock"><Lock aria-hidden="true" />Đăng nhập để xem giá</Link>{guide && <p className="v3-cap">Đã gồm vật liệu và người hướng dẫn</p>}</>
              : <><span className="v3-cap">Giá từ</span><p className="v3d-tprice">{vnd(price.perPerson)}<span className="v3-cap"> /khách</span></p></>}</td>
          <td>{guide && <p className="v3d-rl v3d-rl--ok"><Check aria-hidden="true" />Có nghệ nhân hướng dẫn cả buổi</p>}
            {cancel && <p className="v3d-rl"><Info aria-hidden="true" /><span><b>{cancel.split(':')[0]}:</b>{cancel.slice(cancel.indexOf(':') + 1)}</span></p>}
            <p className="v3d-rl v3d-rl--ok"><Check aria-hidden="true" /><span><b>Không cần trả trước</b>, chỉ thanh toán khi xưởng đã giữ chỗ</span></p></td>
          <td><input type="radio" name="slot" className="v3d-radio" checked={slot.id === chosen} onChange={() => setChosen(slot.id)} aria-label={`Chọn ${slot.label}`} /></td>
        </tr>)}</tbody>
      </table></div>
      <div className="v3d-selp">
        {isAgency
          ? <RequestButton experiences={[{ id: experienceId, name, max }]} date={date} guests={guests} slotTime={selected?.time ?? ''} />
          : <Link className="hab-btn hab-btn--primary" href="/login">Đăng nhập để đặt chỗ</Link>}
        {selected && <p className="v3d-chosen">Đã chọn: <b>{selected.label}, {selected.time}</b></p>}
        {isAgency
          ? <ul className="v3d-perks"><li><Check aria-hidden="true" />Chỉ mất khoảng 1 phút</li><li><Check aria-hidden="true" />Gửi yêu cầu chưa mất phí</li><li><Check aria-hidden="true" />Xưởng nhận lời thì giữ chỗ 72 giờ</li></ul>
          : <><p className="v3d-chosen">Đặt chỗ dành cho tài khoản công ty lữ hành</p>
              <ul className="v3d-perks"><li><Check aria-hidden="true" />Gửi yêu cầu chưa mất phí</li><li><Check aria-hidden="true" />Xưởng nhận lời thì giữ chỗ 72 giờ</li></ul>
              <p className="v3-cap">Chưa có tài khoản? <Link href="/register" className="v3-link">Đăng ký tài khoản công ty lữ hành</Link></p></>}
      </div>
    </div>}
    {week && <div className="v3-card v3d-week"><Info aria-hidden="true" /><p><b>Tuần này còn ít ngày trống:</b> {week}</p></div>}
  </>
}
