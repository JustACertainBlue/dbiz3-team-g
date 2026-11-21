// The one place the hold length is defined (BKG BR-004, UI v3 integration 21/11): booking creation, the expiry scanner
// (lib/booking/expire-holds.ts), the explore texts and the workshop form (screen 32, read-only) all import it. Pure, so client code may too.
export const HOLD_HOURS = 72
/** Older name used by the workshop form and its test. */
export const PROVIDER_HOLD_HOURS = HOLD_HOURS
