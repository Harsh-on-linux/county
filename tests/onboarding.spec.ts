import { setMoney, choose } from "./helpers";
import { test, expect, type Page } from "@playwright/test";
async function settle(page: Page) {
  await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.effect?.getTiming().iterations !== Infinity)
      .forEach((a) => a.finish()),
  );
}
test("guided setup validates input, preserves back-navigation drafts, and persists the first account", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your money. In a good place." }),
  ).toBeVisible();
  await settle(page);
  await page.screenshot({
    path: "test-results/onboarding-welcome.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Find your clarity" }).click();
  await expect(
    page.getByRole("heading", { name: "Together, on your terms." }),
  ).toBeVisible();
  await settle(page);
  await page.screenshot({
    path: "test-results/onboarding-spaces.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Make it yours", exact: true })
    .click();
  await page.getByPlaceholder("Your first name").fill("Harsh");
  await page.getByRole("button", { name: "Bank", exact: true }).click();
  await page
    .getByLabel("Account name", { exact: true })
    .fill("Everyday savings");
  await setMoney(page, "Starting balance", "12000.50");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Set up just for me" }).click();
  await expect(page.getByPlaceholder("Your first name")).toHaveValue("Harsh");
  await expect(page.getByLabel("Account name", { exact: true })).toHaveValue(
    "Everyday savings",
  );
  await settle(page);
  await page.screenshot({
    path: "test-results/onboarding-setup.png",
    fullPage: true,
  });
  await page.getByPlaceholder("Your first name").fill("   ");
  await page.getByRole("button", { name: "Create my space" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByPlaceholder("Your first name").fill("Harsh");
  await setMoney(page, "Starting balance", "12000.50");
  await page.getByRole("button", { name: "Create my space" }).click();
  await expect(
    page.getByRole("heading", { name: "You’re home, Harsh." }),
  ).toBeVisible();
  await settle(page);
  await page.screenshot({
    path: "test-results/onboarding-ready.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open my space" }).click();
  await expect(page.locator(".balance-amount")).toContainText("12,000.50");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hello, Harsh." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your money. In a good place." }),
  ).toHaveCount(0);
  await expect(page.locator(".account-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: /Replay welcome tour/ }).click();
  await page.getByRole("button", { name: "Find your clarity" }).click();
  await page
    .getByRole("button", { name: "Make it yours", exact: true })
    .click();
  await page.getByPlaceholder("Your first name").fill("Changed in preview");
  await setMoney(page, "Starting balance", "999999");
  await page.getByRole("button", { name: "Preview my space" }).click();
  await page.getByRole("button", { name: "Back to County" }).click();
  await expect(
    page.getByRole("heading", { name: "Hello, Harsh." }),
  ).toBeVisible();
  await expect(page.locator(".balance-amount")).toContainText("12,000.50");
});
test("dark theme, compact screens, and reduced motion remain usable", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Find your clarity" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/onboarding-dark-compact.png",
    fullPage: true,
  });
  expect(
    await page
      .locator(".welcome-money-card")
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  await page.getByRole("button", { name: "Find your clarity" }).click();
  await page.getByRole("button", { name: "Set up just for me" }).click();
  await page.getByPlaceholder("Your first name").fill("Mom");
  await page.getByRole("button", { name: "Credit", exact: true }).click();
  await setMoney(page, "Amount currently owed", "1500");
  await page.getByRole("button", { name: "Create my space" }).click();
  await page.getByRole("button", { name: "Open my space" }).click();
  await expect(page.locator(".balance-amount")).toContainText("0.00");
  await expect(page.locator(".account-card")).toContainText("1,500.00");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Settings & backup" })
    .click();
  await page.getByRole("button", { name: /Replay welcome tour/ }).click();
  await expect(
    page.getByRole("heading", { name: "For the life you’re living." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/onboarding-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Close preview" }).click();
  await expect(
    page.getByRole("heading", { name: "Hello, Mom." }),
  ).toBeVisible();
});
