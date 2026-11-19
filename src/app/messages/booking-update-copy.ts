const fieldLabels: Record<string, string> = {
  group_size: 'số khách',
  start_at: 'giờ bắt đầu',
  duration: 'thời lượng',
  agreed_price: 'giá thỏa thuận',
  booking_conditions: 'điều kiện đặt chỗ',
}

export function bookingUpdateCopy(text: string): string {
  const match = /^Booking ([^:]+): (.+), (\d{4})-(\d{2})-(\d{2}) (.+?), (\d+) pax, ([\d,.]+) VND(?:; changed: (.+))?$/.exec(text)
  if (!match) return text

  const [, status, experience, year, month, day, time, guests, price, changed] = match
  const amount = Number(price.replaceAll(',', '')).toLocaleString('vi-VN')
  const fields = changed?.split(',').map(field => fieldLabels[field.trim()]).filter(Boolean)
  const changeSummary = changed ? ` · Đã cập nhật${fields?.length ? ` ${fields.join(', ')}` : ' thông tin đặt chỗ'}` : ''
  return `**${status}** · ${experience} · ${day}/${month}/${year}, ${time} · ${guests} khách · ${amount} ₫${changeSummary}`
}
