// Feature flags read on the server. PAYMENTS_ENABLED (default false): payment wording of UI v3 (QR, refunds) stays
// hidden until the payment wave (human decision 2026-11-18 #4).
export const paymentsEnabled = () => process.env.PAYMENTS_ENABLED === 'true'
