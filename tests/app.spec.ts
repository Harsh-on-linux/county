import { setMoney, choose } from "./helpers";
import { test, expect } from "./fixtures";
test("onboarding, real ledger, offline persistence, sharing, delete and restore", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Find your clarity" }).click();
  await page
    .getByRole("button", { name: "Make it yours", exact: true })
    .click();
  await page.getByPlaceholder("Your first name").fill("Harsh");
  await page.getByRole("button", { name: "Create my space" }).click();
  await page.getByRole("button", { name: "Open my space" }).click();
  await expect(
    page.getByRole("heading", { name: "Hello, Harsh." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add account", exact: true })
    .last()
    .click();
  await page.getByLabel("Account name").fill("Savings");
  await setMoney(page, "Current balance (₹)", "25000");
  await page
    .getByRole("button", { name: "Add account", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .first()
    .click();
  await setMoney(page, "Amount in INR", "850");
  await choose(page, "Account", "Savings");
  await choose(page, "Category", "Groceries");
  await page.getByLabel("Paid to").fill("Fresh Mart");
  await page.getByLabel("Share with household").check();
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.locator(".balance-amount")).toContainText("24,150.00");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  expect(
    await page.evaluate(() =>
      fetch("/brand/county-burst.svg").then((r) => r.ok),
    ),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Hello, Harsh." }),
  ).toBeVisible();
  await expect(page.locator(".balance-amount")).toContainText("24,150.00");
  await expect(page.locator(".sync-pill")).toContainText("Offline");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Household", exact: true })
    .click();
  await expect(page.locator(".household-stats")).toContainText("850");
  await expect(page.getByText("Not connected yet")).toBeVisible();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Activity", exact: true })
    .click();
  await page.getByRole("button", { name: /Fresh Mart/ }).click();
  await page.getByRole("button", { name: "Delete transaction" }).click();
  await expect(page.locator(".activity-card")).not.toContainText("Fresh Mart");
  await page.getByRole("button", { name: "Recently deleted" }).click();
  await page.getByRole("button", { name: /Fresh Mart/ }).click();
  await page.getByRole("button", { name: "Restore transaction" }).click();
  await context.setOffline(false);
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Home", exact: true })
    .click();
  await expect(page.locator(".balance-amount")).toContainText("24,150.00");
  await expect(page.getByRole("button", { name: /Fresh Mart/ })).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile light and dark layouts, forms and real populated screenshots", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Find your clarity" }).click();
  await page
    .getByRole("button", { name: "Make it yours", exact: true })
    .click();
  await page.getByPlaceholder("Your first name").fill("Harsh");
  await page.getByRole("button", { name: "Create my space" }).click();
  await page.getByRole("button", { name: "Open my space" }).click();
  await page
    .getByRole("button", { name: "Add account", exact: true })
    .last()
    .click();
  await page.getByLabel("Account name").fill("Everyday savings");
  await setMoney(page, "Current balance (₹)", "48500");
  await page
    .getByRole("button", { name: "Add account", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .last()
    .click();
  await setMoney(page, "Amount in INR", "280");
  await choose(page, "Category", "Food & drinks");
  await page.getByLabel("Paid to").fill("Sunday coffee");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.locator(".transaction")).toContainText("Sunday coffee");
  await page.screenshot({
    path: "test-results/county-mobile-light.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: "test-results/county-mobile-dark.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: "test-results/county-desktop-dark.png",
    fullPage: true,
  });
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Settings & backup" })
    .click();
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.screenshot({
    path: "test-results/county-desktop-light.png",
    fullPage: true,
  });
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Insights", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Spending by category" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/county-insights.png",
    fullPage: true,
  });
});
