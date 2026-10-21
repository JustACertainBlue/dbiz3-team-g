import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { StoredFileRecord } from "@/types/registration";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_COUNT = 5;

const repoRoot = path.resolve(process.cwd());
const uploadsBaseDir = path.join(repoRoot, "var", "uploads");

export async function saveUploadedFiles(
  registrationRequestId: string,
  files: (File | { name: string; type: string; size: number; arrayBuffer?: () => Promise<ArrayBuffer>; buffer?: Buffer })[]
): Promise<StoredFileRecord[]> {
  if (!files || files.length === 0) {
    throw new Error("At least one registration document is required");
  }

  if (files.length > MAX_FILE_COUNT) {
    throw new Error(`Maximum of ${MAX_FILE_COUNT} files allowed`);
  }

  const targetDir = path.join(uploadsBaseDir, registrationRequestId);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const storedRecords: StoredFileRecord[] = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      throw new Error(`Unsupported file type: ${file.type}. Allowed: PDF, JPG, PNG`);
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File ${file.name} exceeds 10MB limit`);
    }

    const fileId = crypto.randomUUID();
    const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `${registrationRequestId}/${fileId}_${safeName}`;
    const destinationPath = path.join(uploadsBaseDir, storageKey);

    let fileBuffer: Buffer;
    if (typeof file.arrayBuffer === "function") {
      const ab = await file.arrayBuffer();
      fileBuffer = Buffer.from(ab);
    } else if ("buffer" in file && file.buffer) {
      fileBuffer = file.buffer as Buffer;
    } else {
      fileBuffer = Buffer.alloc(0);
    }

    fs.writeFileSync(destinationPath, fileBuffer);

    storedRecords.push({
      file_id: fileId,
      storage_key: storageKey,
      file_name: file.name,
      media_type: file.type,
      file_size_bytes: file.size,
      width_px: null,
      height_px: null,
      uploaded_by: null,
      created_at: new Date(),
    });
  }

  return storedRecords;
}
