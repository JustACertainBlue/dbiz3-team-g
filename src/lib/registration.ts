// TODO: Registration data-access functions (implemented in T021)
import type { Pool } from "pg";

export async function isDuplicateEmail(_email: string, _db?: Pool): Promise<boolean> {
  throw new Error("isDuplicateEmail not implemented");
}

export async function createRegistrationRequest(_data: any, _passwordHash: string, _db?: Pool): Promise<string> {
  throw new Error("createRegistrationRequest not implemented");
}

export async function createAgencyAccount(_registrationRequestId: string, _db?: Pool): Promise<{ userId: string; agencyAccountId: string }> {
  throw new Error("createAgencyAccount not implemented");
}
