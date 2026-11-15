import { test, expect, type Page } from "@playwright/test";
import { loadEnv } from "vite";
import { initial } from "../src/domain";

const url = loadEnv("development", process.cwd()).VITE_SUPABASE_URL;

async function startup(page: Page, corrupt = false) {
  const id = "10000000-0000-4000-8000-000000000001";
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id,
    email: "county-test@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const session = (expired: boolean) => {
    const expires = now + (expired ? -60 : 3600);
    return {
      access_token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ sub: id, exp: expires, iat: now - 3600, aud: "authenticated" })).toString("base64url")}.test`,
      refresh_token: "startup-test-refresh",
      token_type: "bearer",
      expires_at: expires,
      expires_in: expired ? -60 : 3600,
      user,
    };
  };
  let release!: () => void;
  const refresh = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(url + "/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/token")) await refresh;
    const value = path.endsWith("/token")
      ? session(false)
      : path.endsWith("/user")
        ? user
        : path.endsWith("household_snapshot")
          ? { household: null, members: [], entries: [] }
          : path.endsWith("save_backup")
            ? 1
            : null;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(value),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    ({ key, cached, data, id }) => {
      localStorage.setItem(key, JSON.stringify(cached));
      localStorage.setItem("CapacitorStorage.county-data", data);
      localStorage.setItem("CapacitorStorage.county-device-owner", id);
      localStorage.setItem("county-appearance", "dark");
      const seen = new WeakSet();
      (window as any).startupScenes = 0;
      new MutationObserver(() => {
        const scene = document.querySelector(".opening-screen");
        if (scene && !seen.has(scene)) {
          seen.add(scene);
          (window as any).startupScenes++;
        }
      }).observe(document, { childList: true, subtree: true });
    },
    {
      key: `sb-${new URL(url).hostname.split(".")[0]}-auth-token`,
      cached: session(true),
      id,
      data: corrupt
        ? "{broken"
        : JSON.stringify({
            ...initial(),
            theme: "dark",
            onboarded: true,
            name: "Harsh",
            accounts: [
              {
                id: "bank",
                name: "Private savings",
                type: "bank",
                opening: 500000,
              },
            ],
          }),
    },
  );
  return release;
}

test("startup animates while auth loads and never restarts when the session arrives", async ({
  page,
}) => {
  test.skip(!url);
  const release = await startup(page);
  try {
    await page.goto("/");
    await expect(page.locator(".opening-screen")).toHaveAttribute(
      "data-phase",
      "rise",
    );
    await expect(page.locator(".startup-status")).toBeVisible();
    await expect(page.locator(".balance-amount")).toHaveCount(0);
    release();
    await expect(page.locator(".opening-screen")).toHaveCount(0, {
      timeout: 3000,
    });
    await expect(page.locator(".balance-amount")).toContainText("5,000.00");
    expect(await page.evaluate(() => (window as any).startupScenes)).toBe(1);
  } finally {
    release();
  }
});

test("stalled session checks cannot leave startup stuck or expose private records", async ({
  page,
}) => {
  test.skip(!url);
  const release = await startup(page);
  try {
    await page.goto("/");
    await expect(page.locator(".opening-screen")).toHaveCount(0, {
      timeout: 3000,
    });
    await expect(page.locator(".startup-status")).toBeVisible();
    await expect(page.locator(".signin-screen")).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText(/Your connection is taking too long/),
    ).toBeVisible();
    await expect(page.locator(".balance-amount")).toHaveCount(0);
    release();
    await expect(page.locator(".balance-amount")).toContainText("5,000.00");
    expect(await page.evaluate(() => (window as any).startupScenes)).toBe(1);
  } finally {
    release();
  }
});

test("changing orientation during startup exits cleanly without replaying the intro", async ({
  page,
}) => {
  test.skip(!url);
  const release = await startup(page);
  try {
    await page.goto("/");
    await expect(page.locator(".opening-screen")).toHaveAttribute(
      "data-phase",
      "rise",
    );
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator(".opening-screen")).toHaveCount(0);
    release();
    await expect(page.locator(".balance-amount")).toContainText("5,000.00");
    expect(await page.evaluate(() => (window as any).startupScenes)).toBe(1);
  } finally {
    release();
  }
});

test("corrupt local records open recovery and remain untouched after the intro", async ({
  page,
}) => {
  test.skip(!url);
  const release = await startup(page, true);
  release();
  await page.goto("/");
  await expect(page.locator(".opening-screen")).toHaveCount(0, {
    timeout: 3000,
  });
  await expect(
    page.getByRole("heading", { name: "Your records need attention." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("CapacitorStorage.county-data"),
    ),
  ).toBe("{broken");
});
