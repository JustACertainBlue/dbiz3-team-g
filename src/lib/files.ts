// TODO: File upload handling (implemented in T020)
import type { StoredFileRecord } from "@/types/registration";

export async function saveUploadedFiles(
  _registrationRequestId: string,
  _files: File[]
): Promise<StoredFileRecord[]> {
  throw new Error("saveUploadedFiles not implemented");
}
