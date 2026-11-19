export function bookingFormError(message: string): string {
  if (message.includes('outside the Provider operating hours')) {
    return 'Khung giờ này nằm ngoài giờ hoạt động của xưởng. Hãy xem lịch hoạt động và chọn thời gian khác.'
  }
  if (message.includes('overlaps another Booking')) {
    return 'Khung giờ này đã có đoàn đặt. Hãy chọn thời gian khác.'
  }
  if (message.includes('group_size exceeds max_participants')) {
    return 'Số khách vượt quá sức chứa của trải nghiệm. Hãy giảm số khách hoặc chọn trải nghiệm khác.'
  }
  return 'Không lưu được đặt chỗ. Hãy kiểm tra lại thông tin hoặc thử lại sau.'
}
