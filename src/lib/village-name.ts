export function formatVillageName(
  name: string | null | undefined,
  prefix = 'Làng'
): string {
  const trimmed = name?.trim()
  if (!trimmed) return `${prefix} nghề truyền thống`
  return trimmed.toLocaleLowerCase('vi').startsWith('làng')
    ? trimmed
    : `${prefix} ${trimmed}`
}
