import { test as base, expect } from "@playwright/test";
import { loadEnv } from "vite";
const url = loadEnv("development", process.cwd()).VITE_SUPABASE_URL;

// Existing ledger/layout tests start as a signed-in user. All service requests
// are intercepted; financial fixtures never reach the live project.
export const test = base.extend({
  page: async ({ page }, use) => {
    if (url) {
      const id = "10000000-0000-4000-8000-000000000001",
        now = Math.floor(Date.now() / 1000);
      const user = {
        id,
        email: "county-test@example.test",
        aud: "authenticated",
        role: "authenticated",
        app_metadata: {},
        user_metadata: {},
        created_at: new Date().toISOString(),
      };
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ sub: id, exp: now + 3600, iat: now, aud: "authenticated" })).toString("base64url")}.test`;
      const key = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
      await page.addInitScript(
        ({ key, session }) =>
          localStorage.setItem(key, JSON.stringify(session)),
        {
          key,
          session: {
            access_token: token,
            refresh_token: "test-refresh",
            expires_at: now + 3600,
            expires_in: 3600,
            token_type: "bearer",
            user,
          },
        },
      );
      let revision = 0;
      await page.route(url + "/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const value = path.endsWith("household_snapshot")
          ? { household: null, members: [], entries: [] }
          : path.endsWith("save_backup")
            ? ++revision
            : path.endsWith("/user")
              ? user
              : null;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(value),
        });
      });
    }
    await use(page);
  },
});
export { expect };
export type { Page } from "@playwright/test";
