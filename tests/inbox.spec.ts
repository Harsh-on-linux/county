import { test, expect, type Page } from "@playwright/test";
import { initial, today, type Entry } from "../src/domain";
import { choose, setMoney } from "./helpers";

async function seed(
  page: Page,
  options: { accounts?: boolean; duplicate?: boolean } = {},
) {
  await page.setViewportSize({ width: 390, height: 844 });
  const entry: Entry = {
    id: "manual",
    type: "expense",
    amount: 85000,
    account: "cash",
    category: "Groceries",
    payee: "Fresh Mart",
    note: "",
    date: today(),
    shared: false,
    updated: new Date().toISOString(),
  };
  await page.addInitScript(
    (data) => {
      if (!localStorage.getItem("CapacitorStorage.county-data"))
        localStorage.setItem(
          "CapacitorStorage.county-data",
          JSON.stringify(data),
        );
    },
    {
      ...initial(),
      name: "Harsh",
      onboarded: true,
      theme: "light",
      accounts:
        options.accounts === false
          ? []
          : [{ id: "cash", name: "Cash", type: "cash", opening: 4850000 }],
      entries: options.duplicate ? [entry] : [],
      suggestions: [
        {
          id: "fresh",
          amount: 85000,
          type: "expense",
          payee: "Fresh Mart",
          date: today(),
        },
        {
          id: "salary",
          amount: 5000000,
          type: "income",
          payee: "Salary",
          date: today(),
        },
      ],
    },
  );
  await page.goto("/");
  await expect(page.locator(".daily-edition")).toHaveCount(0);
  await page
    .getByRole("button", { name: /Unlabelled.*captured payment/ })
    .click();
}

test("captured payments can be labelled, discarded, restored, and resumed offline", async ({
  page,
  context,
}) => {
  await seed(page);
  const salary = page.locator(".review-row").filter({ hasText: "Salary" });
  await salary.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(salary).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(salary).toBeVisible();
  await salary.getByRole("button", { name: "Discard", exact: true }).click();
  await page
    .locator(".review-row")
    .filter({ hasText: "Fresh Mart" })
    .getByRole("button", { name: "Label", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Label transaction" }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "County number pad" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Label & save" }).click();
  await expect(page.getByRole("alert")).toContainText("Choose a category");
  await choose(page, "Category", "Groceries");
  await page.getByRole("button", { name: "Label & save" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("All clear.", { exact: true })).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("CapacitorStorage.county-data")!),
  );
  expect(stored.entries).toHaveLength(1);
  expect(stored.entries[0]).toMatchObject({
    smsId: "fresh",
    amount: 85000,
    category: "Groceries",
  });
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
  await page.getByRole("button", { name: /Unlabelled.*bank messages/ }).click();
  await page.getByRole("button", { name: /Discarded/ }).click();
  await expect(salary).toBeVisible();
  await salary.getByRole("button", { name: "Restore to unlabelled" }).click();
  await page
    .locator(".review-tabs")
    .getByRole("button", { name: /Unlabelled/ })
    .click();
  await expect(salary).toBeVisible();
});

test("matching a captured payment does not duplicate the recorded expense", async ({
  page,
}) => {
  await seed(page, { duplicate: true });
  await page.getByRole("button", { name: "Match existing" }).click();
  await expect(
    page.locator(".review-row").filter({ hasText: "Fresh Mart" }),
  ).toHaveCount(0);
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("CapacitorStorage.county-data")!),
  );
  expect(stored.entries).toHaveLength(1);
  expect(stored.entries[0].smsId).toBe("fresh");
});

test("pasting a message captures the payment amount, prevents repeats, and preserves a cancelled review", async ({
  page,
}) => {
  await seed(page);
  await page.getByRole("button", { name: "Paste a bank message" }).click();
  await page
    .getByRole("textbox", { name: "Bank message", exact: true })
    .fill(
      "Available balance INR 9,000. Your account debited by Rs. 250 at SHOP Ref 555555555",
    );
  await page.getByRole("button", { name: "Add to unlabelled" }).click();
  const row = page.locator(".review-row").filter({ hasText: "250.00" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Label", exact: true }).click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(row).toBeVisible();
  await page.getByRole("button", { name: "Paste a bank message" }).click();
  await page
    .getByRole("textbox", { name: "Bank message", exact: true })
    .fill(
      "Available balance INR 9,000. Your account debited by Rs. 250 at SHOP Ref 555555555",
    );
  await page.getByRole("button", { name: "Add to unlabelled" }).click();
  await expect(page.getByRole("alert")).toContainText("already been captured");
  await expect(row).toHaveCount(1);
});

test("labelling with no accounts creates the account then returns to the captured payment", async ({
  page,
}) => {
  await seed(page, { accounts: false });
  await page
    .locator(".review-row")
    .filter({ hasText: "Fresh Mart" })
    .getByRole("button", { name: "Label", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Account name" }).fill("Savings");
  await setMoney(page, "Current balance (₹)", "5000");
  await page
    .getByRole("dialog", { name: "Add an account" })
    .getByRole("button", { name: "Add account", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Label transaction" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Amount in INR", exact: true }),
  ).toHaveValue("850");
  await choose(page, "Category", "Groceries");
  await page.getByRole("button", { name: "Label & save" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
