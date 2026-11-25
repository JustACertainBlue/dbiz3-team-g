/**
 * Village name for display. The catalog stores "Bát Tràng" and some villages "Làng gốm Bát Tràng";
 * the prefix is added only when it is not already there, so no screen shows "Làng Làng …".
 */
export function formatVillageName(name: string | null | undefined, prefix = 'Làng'): string {
  const trimmed = name?.trim()
  if (!trimmed) return `${prefix} nghề truyền thống`
  const lower = trimmed.toLocaleLowerCase('vi')
  return lower.startsWith(prefix.toLocaleLowerCase('vi')) || lower.startsWith('làng')
    ? trimmed
    : `${prefix} ${trimmed}`
}
