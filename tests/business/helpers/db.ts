import { execSync } from "node:child_process";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../../../");

export function getAdminDatabaseUrl(): string {
  const url = process.env.ADMIN_DATABASE_URL;
  if (!url) {
    throw new Error("ADMIN_DATABASE_URL environment variable is required");
  }
  return url;
}

export function getTestDatabaseUrl(name: string): string {
  const adminUrl = getAdminDatabaseUrl();
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

export function createTestDb(name: string): string {
  const adminUrl = getAdminDatabaseUrl();
  const testDbUrl = getTestDatabaseUrl(name);
  const psql = process.env.PSQL_PATH || "psql";

  // Terminate any active connections and recreate test database
  execSync(`"${psql}" "${adminUrl}" -c "DROP DATABASE IF EXISTS \\"${name}\\" WITH (FORCE);"`, {
    cwd: repoRoot,
    stdio: "pipe",
  });

  execSync(`"${psql}" "${adminUrl}" -c "CREATE DATABASE \\"${name}\\";"`, {
    cwd: repoRoot,
    stdio: "pipe",
  });

  // Run schema and seed scripts against the newly created test database
  execSync(`"${psql}" "${testDbUrl}" -f "data/schema.sql"`, {
    cwd: repoRoot,
    stdio: "pipe",
  });

  execSync(`"${psql}" "${testDbUrl}" -f "data/seed/load_seed.sql"`, {
    cwd: repoRoot,
    stdio: "pipe",
  });

  process.env.TEST_DATABASE_URL = testDbUrl;
  return testDbUrl;
}

export function dropTestDb(name: string): void {
  const adminUrl = getAdminDatabaseUrl();
  const psql = process.env.PSQL_PATH || "psql";

  execSync(`"${psql}" "${adminUrl}" -c "DROP DATABASE IF EXISTS \\"${name}\\" WITH (FORCE);"`, {
    cwd: repoRoot,
    stdio: "pipe",
  });
}
