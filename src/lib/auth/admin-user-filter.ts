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

type FilterableUser = { name: string; email: string; organization: string; role: string; status: string; created_date: string }

export function filterAdminUsers<T extends FilterableUser>(users: T[], { query, status, role, organization, dateFrom, dateTo }: AdminUserFilters): T[] {
  return users.filter(user => (!status || user.status === status) && (!role || user.role === role) && (!organization || user.organization === organization) && (!dateFrom || hanoiDate(user.created_date) >= dateFrom) && (!dateTo || hanoiDate(user.created_date) <= dateTo) && `${user.name} ${user.email} ${user.organization}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
}
