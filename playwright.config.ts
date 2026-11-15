import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  use: {
    baseURL: "http://127.0.0.1:4173",
    launchOptions: {
      executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    },
  },
  projects: [
    { name: "app", testIgnore: "**/family.spec.ts" },
    {
      name: "family",
      testMatch: "**/family.spec.ts",
      use: { baseURL: "http://127.0.0.1:4174" },
    },
  ],
  webServer: [
    {
      command: "node scripts/preview.mjs",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: true,
      timeout: 20000,
    },
    {
      command:
        "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4174 --strictPort",
      url: "http://127.0.0.1:4174",
      env: {
        VITE_SUPABASE_URL: "http://127.0.0.1:54321",
        VITE_SUPABASE_PUBLISHABLE_KEY: "county-browser-test-public-key",
      },
      reuseExistingServer: false,
      timeout: 20000,
    },
  ],
  workers: 1,
});
