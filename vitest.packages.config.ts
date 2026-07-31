import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "packages/**/__tests__/**/*.test.ts",
      "packages/**/*.test.ts",
      // The day-zero doctor lives in scripts/ and is matched by no workspace
      // config; without this its tests never run in `npm run test`.
      "scripts/**/*.test.ts",
    ],
    passWithNoTests: true,
  },
});
