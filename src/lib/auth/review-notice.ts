// HDT review notice on admin/agencies (#58): report what the review API returned (spec-AUT FR-018 §5.1
// notification_status), never claim an email that was not handed to the delivery adapter.
export function reviewNotice(emailDeliveryStatus?: string): string {
  if (emailDeliveryStatus === 'Dev outbox') {
    return 'Đã lưu quyết định và thông báo trong ứng dụng. Email đã được ghi vào hộp thư thử nghiệm (dev-outbox), chưa gửi qua dịch vụ email thật.'
  }
  // #124: the decision is saved whatever happened to the email; say that first, then why no email went out.
  if (emailDeliveryStatus === 'Fail') {
    return 'Đã lưu quyết định — email chưa gửi được. Đã tạo thông báo trong ứng dụng; email chưa được gửi vì dịch vụ email báo lỗi.'
  }
  return 'Đã lưu quyết định — email chưa gửi được. Đã tạo thông báo trong ứng dụng; email chưa được gửi vì chưa cấu hình dịch vụ.'
}
