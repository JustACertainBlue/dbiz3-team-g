export function formatExperienceDuration(minutes: number | null | undefined): string {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) {
    return 'Chưa có dữ liệu'
  }

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours && remainder
    ? `${hours} giờ ${remainder} phút`
    : hours
      ? `${hours} giờ`
      : `${remainder} phút`
}

export function formatExperienceCapacity(maxParticipants: number | null | undefined): string {
  return typeof maxParticipants === 'number' && Number.isFinite(maxParticipants) && maxParticipants > 0
    ? `Tối đa ${maxParticipants} khách`
    : 'Chưa có dữ liệu'
}
