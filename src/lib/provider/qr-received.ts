// Screen 29 (DSH018) "Đã nhận qua QR tháng N": sum the amount of bookings marked received (On hold → Booked) in the month,
// excluding bookings whose current status is Cancelled (UI v3 handoff bug QR).
type Row = Record<string, string | undefined>

export function receivedViaQr(seed: { bookings: Row[]; history: Row[] }, providerId: string, month: string): number {
  const pressed = new Set(seed.history
    .filter(row => row.from_status === 'On hold' && row.to_status === 'Booked' && (row.changed_at ?? '').slice(0, 7) === month)
    .map(row => row.booking_id))
  return seed.bookings
    .filter(row => row.provider_id === providerId && row.status !== 'Cancelled' && pressed.has(row.booking_id))
    .reduce((sum, row) => sum + (Number(row.agreed_price_total) || 0), 0)
}

export const formatReceived = (value: number) => `${value.toLocaleString('vi-VN')} ₫`
