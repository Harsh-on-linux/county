import { test, expect, type Page } from "@playwright/test";
import { initial, today, type Data } from "../src/domain";
import { choose, setMoney } from "./helpers";
test("zero starting balances are accepted through the County number pad", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.getByRole("button", { name: "Add account", exact: true }).click();
  await page.getByLabel("Account name", { exact: true }).fill("New account");
  await setMoney(page, "Current balance (₹)", "0.00");
  await page
    .getByRole("button", { name: "Add account", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("button", { name: /BANK New account/ }),
  ).toContainText("0.00");
});
const day = today();
function fixture(): Data {
  return {
    ...initial(),
    onboarded: true,
    name: "Harsh",
    accounts: [
      { id: "bank", name: "Everyday bank", type: "bank", opening: 2000000 },
      { id: "cash", name: "Cash", type: "cash", opening: 100000 },
      { id: "card", name: "Credit card", type: "card", opening: -50000 },
    ],
    suggestions: [
      {
        id: "sms-demo",
        amount: 85000,
        type: "expense",
        payee: "Fresh Mart",
        date: day,
      },
    ],
  };
}
async function seed(page: Page, data = fixture()) {
  await page.addInitScript((d) => {
    if (!localStorage.getItem("CapacitorStorage.county-data"))
      localStorage.setItem("CapacitorStorage.county-data", JSON.stringify(d));
  }, data);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Navigate County" }),
  ).toBeVisible();
  if (await page.getByRole("button", { name: "Skip intro" }).isVisible())
    await page.getByRole("button", { name: "Skip intro" }).click();
}
async function navigate(page: Page, destination: string) {
  await page.getByRole("button", { name: "Navigate County" }).click();
  await page
    .locator(".dock-destinations")
    .getByRole("button", { name: destination, exact: true })
    .click();
}
test("amount-first composer supports precise input, draft-preserving back navigation and all money types", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .last()
    .click();
  const amount = page.getByRole("textbox", {
    name: "Amount in INR",
    exact: true,
  });
  await expect(amount).toHaveAttribute("readonly", "");
  await expect(amount).toHaveAttribute("inputmode", "none");
  const pad = page.getByRole("group", { name: "County number pad" });
  await pad.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  for (const digit of ["1", "Decimal point", "2", "3", "4", "Decimal point"])
    await pad.getByRole("button", { name: digit, exact: true }).click();
  await expect(amount).toHaveValue("1.23");
  await pad.getByRole("button", { name: "Delete last digit" }).click();
  await pad.getByRole("button", { name: "5", exact: true }).click();
  await expect(amount).toHaveValue("1.25");
  await page.screenshot({
    path: "test-results/county-keypad-light.png",
    fullPage: true,
  });
  await setMoney(page, "Amount in INR", "1250.50");
  await choose(page, "Account", "Everyday bank");
  await choose(page, "Category", "Groceries");
  await page.getByLabel("Paid to", { exact: true }).fill("Corner market");
  await page.getByRole("checkbox", { name: /Share with household/ }).check();
  await page.getByRole("button", { name: "Back to amount" }).click();
  await setMoney(page, "Amount in INR", "500.25");
  await expect(page.getByLabel("Paid to", { exact: true })).toHaveValue(
    "Corner market",
  );
  await expect(
    page.getByRole("combobox", { name: "Account", exact: true }),
  ).toContainText("Everyday bank");
  await page.screenshot({
    path: "test-results/county-record-details.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.locator(".balance-amount")).toContainText("20,499.75");
  await navigate(page, "Household");
  await expect(page.locator(".household-stats")).toContainText("500");
  await page.screenshot({
    path: "test-results/county-household-new.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Transfer", exact: true }).click();
  await setMoney(page, "Amount in INR", "100");
  await choose(page, "From account", "Everyday bank");
  await choose(page, "To account", "Credit card");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await navigate(page, "Home");
  await expect(page.locator(".balance-amount")).toContainText("20,399.75");
  await expect(
    page.getByRole("button", { name: /CREDIT CARD Credit card/ }),
  ).toContainText("400.00");
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Income", exact: true }).click();
  await setMoney(page, "Amount in INR", "200");
  await choose(page, "Account", "Everyday bank");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.locator(".balance-amount")).toContainText("20,599.75");
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Adjustment", exact: true }).click();
  await setMoney(page, "Amount in INR", "50");
  await choose(page, "Account", "Everyday bank");
  await choose(page, "Direction", "Decrease balance");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.locator(".balance-amount")).toContainText("20,549.75");
  await page
    .getByRole("button", { name: "View transactions for " + day })
    .click();
  await expect(page.getByRole("heading", { name: "The ledger" })).toBeVisible();
  await expect(page.locator(".activity-card .transaction")).toHaveCount(4);
  await choose(page, "Transaction type filter", "Expense");
  await expect(page.locator(".activity-card .transaction")).toHaveCount(1);
  await page.screenshot({
    path: "test-results/county-ledger-new.png",
    fullPage: true,
  });
});
test("SMS review, custom navigation and dark layouts use the same recording flow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await seed(page);
  await page.getByRole("button", { name: "Navigate County" }).click();
  await page.screenshot({
    path: "test-results/county-spaces-menu.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Close navigation" }).click();
  await page
    .getByRole("button", { name: /Unlabelled.*captured payment/ })
    .click();
  await page.getByRole("button", { name: "Label", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Amount in INR", exact: true }),
  ).toHaveValue("850");
  await page
    .getByRole("textbox", { name: "Amount in INR", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/county-keypad-dark.png",
    fullPage: true,
  });
  await page
    .getByRole("group", { name: "County number pad" })
    .getByRole("button", { name: "Continue", exact: true })
    .click();
  await choose(page, "Account", "Cash");
  await choose(page, "Category", "Groceries");
  await page.getByRole("button", { name: "Label & save" }).click();
  await navigate(page, "Home");
  await expect(page.locator(".balance-amount")).toContainText("20,150.00");
  await navigate(page, "Insights");
  await expect(
    page.getByRole("heading", { name: "Spending by category" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/county-patterns-dark.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: /Replay coin intro/ }).click();
  await expect(page.locator(".intro-coin")).toBeVisible();
  await expect(page.locator(".intro-coin")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".intro-front .brand-mark")).toBeAttached();
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(
    page.getByRole("heading", { name: "Spending by category" }),
  ).toBeVisible();
});
