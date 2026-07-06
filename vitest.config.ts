import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./src/test/setupEnv.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/test/**",
        "src/types/**",
        "src/server.ts",
        "src/util/generateModule.ts",
        "src/util/fileTemplates.ts",
      ],
    },
  },
});
