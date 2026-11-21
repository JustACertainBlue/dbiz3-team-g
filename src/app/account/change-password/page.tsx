// The password change is a panel of /account (screen 19). This old URL stays because the login of a temporary-password
// account still answers redirectTo "/account/change-password"; /account then shows only the password panel.
import { redirect } from 'next/navigation'

export default function ChangePasswordPage() {
  return redirect('/account?tab=password')
}
