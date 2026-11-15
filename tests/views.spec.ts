import { test, expect, type Page } from "./fixtures";
import { initial, money, today, type Data, type Entry } from "../src/domain";
import { choose, setMoney } from "./helpers";

function fixture(theme: "light" | "dark" = "light"): Data {
  const month = today().slice(0, 7);
  const expense = (
    id: string,
    payee: string,
    amount: number,
    date: string,
    category = "Groceries",
    shared = false,
  ): Entry => ({
    id,
    type: "expense",
    amount,
    date,
    payee,
    category,
    account: "bank",
    note: "",
    shared,
    updated: new Date().toISOString(),
  });
  return {
    ...initial(),
    onboarded: true,
    name: "Harsh",
    theme,
    accounts: [
      {
        id: "bank",
        name: "Everyday savings",
        type: "bank",
        opening: 5000000,
        color: "sand",
      },
      {
        id: "cash",
        name: "Cash",
        type: "cash",
        opening: 250000,
        color: "sage",
      },
    ],
    entries: [
      expense(
        "food",
        "Neighbourhood groceries and provisions",
        125000,
        today(),
        "Groceries",
        true,
      ),
      expense("rent", "Home rent", 800000, month + "-01", "Home", true),
      expense("coffee", "Sunday coffee", 28000, month + "-08", "Food & drinks"),
      {
        ...expense("salary", "Salary", 4000000, month + "-01", "Salary"),
        type: "income",
      },
    ],
    suggestions: [
      {
        id: "captured-1",
        amount: 42500,
        type: "expense",
        payee: "Fresh Mart",
        date: today(),
        sender: "VM-BANK",
        accountHint: "1234",
      },
      {
        id: "captured-2",
        amount: 100000,
        type: "income",
        payee: "Cashback",
        date: today(),
        sender: "VM-BANK",
        accountHint: "1234",
      },
    ],
  };
}
async function seed(page: Page, theme: "light" | "dark" = "light") {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((data) => {
    if (!localStorage.getItem("CapacitorStorage.county-data"))
      localStorage.setItem(
        "CapacitorStorage.county-data",
        JSON.stringify(data),
      );
    localStorage.setItem("county-appearance", data.theme);
  }, fixture(theme));
  await page.goto("/");
  await expect(page.locator(".opening-screen")).toHaveCount(0, {
    timeout: 10000,
  });
}
async function navigate(page: Page, name: string) {
  await page.getByRole("button", { name: "Navigate County" }).click();
  await page
    .locator(".dock-destinations")
    .getByRole("button", { name, exact: true })
    .click();
}
async function fit(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function screenshot(page: Page, name: string, fullPage = true) {
  await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.effect?.getTiming().iterations !== Infinity)
      .forEach((a) => a.finish()),
  );
  await page.screenshot({
    path: `test-results/${name}.png`,
    fullPage,
    animations: "disabled",
  });
}
for (const theme of ["light", "dark"] as const)
  test(`${theme}: every view, settings section and record sheet fits compact phones`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await seed(page, theme);
    await screenshot(page, `views-home-${theme}`);
    await expect(page.locator(".balance-flow")).toHaveCSS(
      "--flow-start",
      theme === "light" ? "#f3f0e8" : "#111214",
    );
    await expect(page.locator(".balance-amount")).toHaveCSS(
      "color",
      theme === "light" ? "rgb(48, 38, 30)" : "rgb(251, 247, 241)",
    );
    await expect(page.locator(".balance-bottom")).toHaveCSS(
      "background-color",
      theme === "light" ? "rgb(251, 244, 233)" : "rgb(23, 24, 26)",
    );
    for (const name of ["Activity", "Unlabelled", "Household", "Insights"]) {
      await navigate(page, name);
      await fit(page);
      await screenshot(page, `views-${name.toLowerCase()}-${theme}`);
      await page.setViewportSize({ width: 320, height: 640 });
      await fit(page);
      if (name === "Activity") {
        await expect(page.locator(".ledger-day")).toHaveCount(3);
        await page.getByRole("button", { name: /^Filters/ }).click();
        await screenshot(page, `views-ledger-filters-${theme}-320`);
        await page.getByRole("button", { name: /^Filters/ }).click();
      }
      if (name === "Unlabelled") {
        await expect(
          page.getByRole("combobox", { name: "Scan period" }),
        ).toHaveCount(0);
        await page
          .getByRole("button", { name: "Scan options", exact: true })
          .click();
        await choose(page, "Scan period", "Custom dates");
        await fit(page);
        await screenshot(page, `views-scan-options-${theme}-320`);
        await page
          .getByRole("button", { name: "Hide options", exact: true })
          .click();
      }
      if (name === "Household") {
        await page.getByRole("button", { name: "Connect your family" }).click();
        await screenshot(page, `views-family-choices-${theme}-320`, false);
        await page.getByRole("button", { name: /Create a family/ }).click();
        await screenshot(page, `views-family-create-${theme}-320`, false);
        await page.getByRole("button", { name: "Back", exact: true }).click();
        await page.getByRole("button", { name: /Join a family/ }).click();
        await screenshot(page, `views-family-join-${theme}-320`, false);
        await page.getByRole("button", { name: "Close dialog" }).click();
      }
      if (name === "Insights") {
        await page.getByRole("button", { name: /^Days 1–7:/ }).click();
        await expect(page.locator(".week-reading strong")).toHaveText(
          money(800000),
        );
        await page.getByText("Explore the days", { exact: true }).click();
        await fit(page);
        await screenshot(page, `views-insight-calendar-${theme}-320`);
      }
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    for (const section of ["Appearance", "Personal", "Backups", "Account"]) {
      await page.getByRole("tab", { name: section, exact: true }).click();
      await screenshot(
        page,
        `views-settings-${section.toLowerCase()}-${theme}`,
        false,
      );
      await page.setViewportSize({ width: 320, height: 640 });
      await fit(page);
      await screenshot(
        page,
        `views-settings-${section.toLowerCase()}-${theme}-320`,
        false,
      );
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page
      .getByRole("button", { name: "Add transaction", exact: true })
      .last()
      .click();
    await setMoney(page, "Amount in INR", "950");
    await choose(page, "Category", "Groceries");
    await screenshot(page, `views-record-details-${theme}`, false);
    await page.getByRole("button", { name: "Close dialog" }).click();
    expect(errors).toEqual([]);
  });

test("ledger filters remain understandable when folded away, and reset restores the dated statement", async ({
  page,
}) => {
  await seed(page);
  await navigate(page, "Activity");
  await expect(page.locator(".activity-card .transaction")).toHaveCount(4);
  const salary = page
    .locator(".activity-card .transaction")
    .filter({ hasText: "Salary" });
  await expect(salary.locator(".transaction-info")).toContainText(
    "Everyday savings",
  );
  await salary.click();
  await expect(
    page.getByRole("textbox", { name: "Amount in INR", exact: true }),
  ).toHaveValue("40,000");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await choose(page, "Category filter", "Groceries");
  await expect(page.locator(".activity-card .transaction")).toHaveCount(1);
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.getByRole("button", { name: /^Filters/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.locator(".activity-card .transaction")).toHaveCount(4);
  await page
    .getByRole("textbox", { name: "Search transactions" })
    .fill("Home rent");
  await expect(page.locator(".activity-card .transaction")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.locator(".activity-card .transaction")).toHaveCount(4);
});

test("backup restore is reviewed in-app, cancellation preserves records, and personal categories persist", async ({
  page,
}) => {
  await seed(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Personal", exact: true }).click();
  await page.getByRole("textbox", { name: "New category" }).fill("Pets");
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  await expect(page.locator(".category-tokens")).toContainText("Pets");
  await page.getByRole("tab", { name: "Backups", exact: true }).click();
  const file = page.getByLabel("Restore a backup", { exact: true });
  await file.setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(page.getByRole("alert")).toContainText("not a valid County");
  const replacement = {
    ...initial(),
    onboarded: true,
    name: "Harsh",
    accounts: [
      {
        id: "restored",
        type: "bank",
        name: "Restored savings",
        opening: 123000,
        color: "blue",
      },
    ],
  };
  const upload = {
    name: "county.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(replacement)),
  };
  await file.setInputFiles(upload);
  await expect(page.locator(".restore-review")).toContainText(
    "1 account and 0 records",
  );
  await page.getByRole("button", { name: "Keep current records" }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("CapacitorStorage.county-data")!)
          .entries.length,
    ),
  ).toBe(4);
  await file.setInputFiles(upload);
  await page
    .getByRole("button", { name: "Replace records", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await navigate(page, "Home");
  await expect(page.locator(".balance-amount")).toHaveText("₹1,230.00");
  await expect(page.locator(".account-card")).toContainText("Restored savings");
});
