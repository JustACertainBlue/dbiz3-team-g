import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Chạy: AIT_LIB_DIR=src/lib/ait npx vitest run -c vitest.ait.config.ts
// AIT_LIB_DIR = thư mục chứa các module theo "Hợp đồng module" (Phần F của spec).
export default defineConfig({
  resolve: {
    alias: {
      '@ait': path.resolve(process.cwd(), process.env.AIT_LIB_DIR ?? 'src/lib/ait'),
    },
  },
  test: {
    include: ['tests/ait/ait121.grading.test.ts'],
    testTimeout: 20000,
  },
});
