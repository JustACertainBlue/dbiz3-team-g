import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { RegistrationError, type OtpDelivery } from './registration-service'

/** Explicit local development adapter matching PR #11's dev-outbox contract. */
export function registrationDelivery(): OtpDelivery {
  if (process.env.NODE_ENV === 'production' || process.env.HAB_EMAIL_MODE !== 'dev-outbox') {
    throw new RegistrationError('Email delivery is not configured. Registration is temporarily unavailable.', 503)
  }
  return message => {
    const directory = join(process.cwd(), '.demo-data', 'otp-outbox')
    mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, `${message.registration_request_id}-${randomUUID()}.json`), JSON.stringify(message), { mode: 0o600 })
  }
}
