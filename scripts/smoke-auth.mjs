// Local synthetic-fixture smoke check. Never use real credentials here.
const origin = process.env.HAB_SMOKE_ORIGIN || 'http://localhost:3000'
const provider = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const agency = '02e568d8-d65e-54b1-a554-b411150d1dcb'
const scenarios = [
  ['agency','thanhvien13@example.invalid','Tour_Agency',null,['/explore','/ai-matching',`/agency/${agency}`,`/agency/${agency}/bookings`,`/agency/${agency}/schedule`,'/messages','/account']],
  ['provider','thanhvien19@example.invalid','Local_Provider',null,[`/provider/${provider}/dashboard`,`/provider/${provider}`,`/provider/${provider}/experiences`,`/provider/${provider}/bookings`,`/provider/${provider}/schedule`,'/messages','/account']],
  ['hdt','thanhvien9@example.invalid','ADMIN','HDT',['/admin','/admin/providers','/admin/users','/admin/agencies','/admin/create-account','/account']],
  ['ubnd','thanhvien8@example.invalid','ADMIN','UBND',['/admin','/admin/providers','/admin/users','/admin/create-account','/account']],
]
let pages = 0, assertions = 0
async function check(path, cookie, status = 200) {
  const response = await fetch(`${origin}${path}`, { headers: cookie ? { cookie } : {}, signal: AbortSignal.timeout(60000) })
  if (response.status !== status) throw new Error(`${path}: expected ${status}, got ${response.status}`)
  assertions++; return response
}
for (const [name,email,role,adminType,paths] of scenarios) {
  const login = await fetch(`${origin}/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password:'synthetic-smoke'}), signal:AbortSignal.timeout(60000) })
  if (!login.ok) throw new Error(`${name}: fixture login failed (${login.status}); use the development server`)
  const cookie = login.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ')
  try {
    const context = (await (await check('/api/auth/session',cookie)).json()).data.session
    if (context.role !== role || context.adminType !== adminType) throw new Error(`${name}: wrong canonical session`)
    for (const path of paths) { await check(path,cookie); pages++ }
    await check('/api/auth/account',cookie)
    await check('/api/auth/users',cookie,role==='ADMIN'?200:403)
    await check('/api/auth/agency-reviews',cookie,adminType==='HDT'?200:403)
    await check('/api/auth/users/create',cookie,role==='ADMIN'?200:403)
  } finally {
    const logout = await fetch(`${origin}/api/auth/logout`, { method:'POST',headers:{cookie} })
    if (!logout.ok) throw new Error(`${name}: logout failed`)
    const expired = (await (await check('/api/auth/session',cookie)).json()).data.session
    if (expired.authenticated) throw new Error(`${name}: logout did not revoke the session`)
  }
}
for (const path of ['/login','/register','/register/otp','/register/status','/forgot-password','/forgot-password/sent','/reset-password','/reset-password/success','/account/change-password']) { await check(path); pages++ }
console.log(`PASS: ${pages} page responses; ${assertions} HTTP checks across 4 roles, scopes and login/logout.`)
