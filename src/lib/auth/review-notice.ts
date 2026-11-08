// HDT review notice on admin/agencies (#58): report what the review API returned (spec-AUT FR-018 §5.1
// notification_status), never claim an email that was not handed to the delivery adapter.
export function reviewNotice(emailDeliveryStatus?: string): string {
  if (emailDeliveryStatus === 'Dev outbox') {
    return 'Đã lưu quyết định và thông báo trong ứng dụng. Email đã được ghi vào hộp thư thử nghiệm (dev-outbox), chưa gửi qua dịch vụ email thật.'
  }
  return 'Đã lưu quyết định và thông báo trong ứng dụng. Email chưa được gửi vì chưa cấu hình dịch vụ.'
}
