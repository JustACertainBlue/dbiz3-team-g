// v3 mockup (png/39) has no "Tạo tài khoản" entry: the old URL goes to the account list.
// The form itself is kept in CreateAccountForm.tsx (unused) so the create-account API and its tests stay intact.
import { redirect } from 'next/navigation'

export default function CreateAccountPage(): never {
  redirect('/admin/users')
}
