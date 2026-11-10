// The "seeded email + any non-empty password" prototype login (docs/build/demo-login.md, ADR 0001) is a
// development aid only. One condition for the server (authenticatePrototype) and the /login page (#102),
// so the page never offers a login that the server refuses. Client-safe: no server imports.
export function prototypeLoginEnabled(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv !== 'production'
}
