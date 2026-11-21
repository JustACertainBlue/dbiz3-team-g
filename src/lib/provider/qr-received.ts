// Screen 29 (DSH018) "Đã nhận qua QR tháng N": there is no payment gateway, so the money counted is the agreed_price_total of the
// workshop's bookings whose "Đã nhận tiền" (On hold → Booked) was pressed in the month (UI v3 integration, human decision 21/11).
type Row = Record<string, string | undefined>

export function receivedViaQr(seed: { bookings: Row[]; history: Row[] }, providerId: string, month: string): number {
  const pressed = new Set(seed.history
    .filter(row => row.from_status === 'On hold' && row.to_status === 'Booked' && (row.changed_at ?? '').slice(0, 7) === month)
    .map(row => row.booking_id))
  return seed.bookings
    .filter(row => row.provider_id === providerId && pressed.has(row.booking_id))
    .reduce((sum, row) => sum + (Number(row.agreed_price_total) || 0), 0)
}

export const formatReceived = (value: number) => `${value.toLocaleString('vi-VN')} ₫`
