/** True in the production build, where the language model is required and rules are never a fallback. */
export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production'
}
