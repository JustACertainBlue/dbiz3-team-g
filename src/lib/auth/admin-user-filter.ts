import { hanoiDate } from '../time/hanoi-time'

// Filter of the admin account list (`/admin/users`), moved out of the client page unchanged so it can be
// tested. "Ngày tạo từ/đến" compare the Hanoi local date of `created_date` (spec-BKG #31, issue #87):
// PostgreSQL returns `created_at` as UTC.
export interface AdminUserFilters {
  query: string
  status: string
  role: string
  organization: string
  dateFrom: string
  dateTo: string
}

type FilterableUser = { name: string; email: string; organization: string; role: string; admin_type?: string; status: string; created_date: string }

export function filterAdminUsers<T extends FilterableUser>(users: T[], { query, status, role, organization, dateFrom, dateTo }: AdminUserFilters): T[] {
  return users.filter(user => (!status || user.status === status) && (!role || user.role === role || roleValue(user) === role) && (!organization || user.organization === organization) && (!dateFrom || hanoiDate(user.created_date) >= dateFrom) && (!dateTo || hanoiDate(user.created_date) <= dateTo) && `${user.name} ${user.email} ${user.organization}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
}

// #159: UBND and HDT are both role ADMIN; the subtype is `admin_type` (consistency contract). A role
// filter value is a role code, or `ADMIN:<admin_type>` for one Admin subtype.
const ROLE_ORDER = [
  { value: 'Tour_Agency', label: 'Tour Agency' },
  { value: 'Local_Provider', label: 'Local Provider' },
  { value: 'ADMIN:UBND', label: 'Admin UBND' },
  { value: 'ADMIN:HDT', label: 'Admin HDT' },
]

export function roleValue(user: { role: string; admin_type?: string }): string {
  return user.role === 'ADMIN' && user.admin_type ? `ADMIN:${user.admin_type}` : user.role
}

// Only the roles present in the list the actor may see (UBND sees Local Providers only).
export function roleOptions(users: { role: string; admin_type?: string }[]): { value: string; label: string }[] {
  const present = new Set(users.map(roleValue))
  return ROLE_ORDER.filter(option => present.has(option.value))
}
