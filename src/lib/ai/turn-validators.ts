import {
  hasInvalidRadiusConstraint,
  hasNonPositiveGroupSize,
  hasUnsupportedDistanceConstraint,
  hasZeroRadiusConstraint,
  isBookingActionRequest,
  isExplicitConversationReset,
} from '@/lib/ait/conversation-state'

// Requests that can be answered without the model. Each answer is fixed text; no state is changed
// except by an explicit reset.

export type PreCheck =
  | { kind: 'notice'; reply: string }
  | { kind: 'reset'; reply: string }

export function preCheckTurn(text: string): PreCheck | null {
  if (isExplicitConversationReset(text)) {
    return { kind: 'reset', reply: 'Mình đã xoá các tiêu chí cũ. Đoàn của bạn muốn tìm trải nghiệm gì?' }
  }
  if (hasNonPositiveGroupSize(text)) {
    return { kind: 'notice', reply: 'Số khách không hợp lệ; vui lòng nhập số nguyên dương.' }
  }
  if (hasZeroRadiusConstraint(text) || hasInvalidRadiusConstraint(text)) {
    return { kind: 'notice', reply: 'Bán kính không hợp lệ; vui lòng nhập giá trị lớn hơn 0 km.' }
  }
  if (hasUnsupportedDistanceConstraint(text)) {
    return { kind: 'notice', reply: 'Mình chưa hỗ trợ điều kiện khoảng cách dạng khoảng hoặc "xa hơn … km". Bạn bỏ điều kiện này hoặc nêu lại giúp mình nhé.' }
  }
  if (isBookingActionRequest(text)) {
    return { kind: 'notice', reply: 'Mình không đặt chỗ thay bạn được. Bạn dùng Yêu cầu báo giá hoặc Chat với xưởng để chốt, xưởng sẽ xác nhận lịch.' }
  }
  return null
}
