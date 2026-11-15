import { test, expect, type Page } from "./fixtures";
import { initial, today } from "../src/domain";
import { choose, setMoney } from "./helpers";

async function seed(page: Page, theme = "light") {
  await page.setViewportSize({ width: 390, height: 844 });
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
      theme,
      accounts: [
        {
          id: "bank",
          name: "Family savings account",
          type: "bank",
          opening: 4850000,
        },
      ],
      entries: [
        {
          id: "expense",
          type: "expense",
          amount: 85000,
          account: "bank",
          category: "Groceries",
          payee: "Neighbourhood groceries and provisions",
          note: "",
          date: today(),
          shared: false,
          updated: new Date().toISOString(),
        },
      ],
    },
  );
  await page.goto("/");
  if (await page.getByRole("button", { name: "Skip intro" }).isVisible())
    await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.locator(".balance-amount")).toBeVisible();
  await expect(page.locator(".county-opening")).toHaveCount(0, {
    timeout: 10000,
  });
}
async function inbox(page: Page) {
  await page.getByRole("button", { name: "Navigate County" }).click();
  await page
    .locator(".dock-destinations")
    .getByRole("button", { name: /Unlabelled/ })
    .click();
}
async function stored(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("CapacitorStorage.county-data")!),
  );
}
test("account colours can be changed without changing history, and new wallets keep their colour", async ({
  page,
}) => {
  await seed(page);
  await page.getByRole("button", { name: "Manage accounts" }).click();
  await page
    .getByRole("button", { name: "Edit Family savings account" })
    .click();
  await page.getByRole("button", { name: "Blue", exact: true }).click();
  await page.getByRole("button", { name: "Save account", exact: true }).click();
  const toast = page.locator(".toast");
  await expect(toast).toBeVisible();
  const toastBounds = await toast.boundingBox();
  expect(toastBounds!.x).toBeGreaterThanOrEqual(0);
  expect(toastBounds!.x + toastBounds!.width).toBeLessThanOrEqual(390);
  let data = await stored(page);
  expect(data.accounts[0]).toMatchObject({
    id: "bank",
    color: "blue",
    opening: 4850000,
  });
  expect(data.entries).toHaveLength(1);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    page.locator(".account-card[data-account-colour=blue]"),
  ).toContainText("47,650.00");
  await page.getByRole("button", { name: "Add account", exact: true }).click();
  await choose(page, "Account type", "Wallet");
  await page
    .getByLabel("Account name", { exact: true })
    .fill("Everyday wallet");
  await page.getByRole("button", { name: "Rose", exact: true }).click();
  await page.screenshot({
    path: "test-results/account-colours-light.png",
    fullPage: false,
  });
  await setMoney(page, "Current balance (₹)", "2500");
  await page
    .getByRole("button", { name: "Add account", exact: true })
    .last()
    .click();
  await page.reload();
  await expect(
    page.locator(".account-card[data-account-colour=rose]"),
  ).toContainText("Everyday wallet");
  data = await stored(page);
  expect(data.accounts[1]).toMatchObject({
    color: "rose",
    type: "wallet",
    opening: 250000,
  });
});

test("manual Android scans pass inclusive date bounds and leave other messages available for later scans", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.scanCalls = [];
    w.CapacitorCustomPlatform = { name: "android" };
    w.Capacitor = {
      PluginHeaders: [
        {
          name: "CountyNative",
          methods: [{ name: "readSms", rtype: "promise" }],
        },
      ],
      nativePromise: async (_plugin: string, _method: string, options: any) => {
        w.scanCalls.push(options);
        if (!options.requestPermission) return { messages: [] };
        return {
          messages: [
            { id: "before", timestamp: +new Date("2024-01-01T00:00:00") - 1 },
            { id: "first", timestamp: +new Date("2024-01-01T00:00:00") },
            { id: "last", timestamp: +new Date("2024-01-03T00:00:00") - 1 },
            { id: "after", timestamp: +new Date("2024-01-03T00:00:00") },
          ].map((m, i) => ({
            ...m,
            body: `INR ${250 + i} debited from A/c XX1234 at SHOP Ref ${555555550 + i}`,
            sender: "VM-BANK",
          })),
        };
      },
    };
  });
  await seed(page);
  await inbox(page);
  await choose(page, "Scan period", "Custom dates");
  await page.getByLabel("From date", { exact: true }).fill("2024-01-01");
  await page.getByLabel("To date", { exact: true }).fill("2024-01-02");
  await page.getByRole("button", { name: "Enable message capture" }).click();
  await expect(page.locator(".review-row")).toHaveCount(2);
  const call = await page.evaluate(() =>
    (window as any).scanCalls.find((c: any) => c.requestPermission),
  );
  expect(call.since).toBe(
    await page.evaluate(() => +new Date("2024-01-01T00:00:00")),
  );
  expect(call.until).toBe(
    await page.evaluate(() => +new Date("2024-01-03T00:00:00")),
  );
  const data = await stored(page);
  expect(data.seenSms).not.toContain("before");
  expect(data.seenSms).not.toContain("after");
  expect(data.suggestions.map((s: any) => s.id)).toEqual(["first", "last"]);
  expect(data.smsScanRange).toEqual({ from: "2024-01-01", to: "2024-01-02" });
  await page.screenshot({
    path: "test-results/scan-dates-light.png",
    fullPage: true,
  });
});

for (const theme of ["light", "dark"])
  test(`${theme} compact layout keeps larger text, long payees and controls inside the screen`, async ({
    page,
  }) => {
    await seed(page, theme);
    await page.setViewportSize({ width: 320, height: 640 });
    await expect(page.locator("html")).toHaveCSS(
      "background-color",
      theme === "dark" ? "rgb(19, 20, 22)" : "rgb(245, 245, 245)",
    );
    await expect(page.locator(".mobile-brand .brand-mark")).toHaveCSS(
      "color",
      "rgb(230, 84, 22)",
    );
    for (const selector of [
      ".transaction-info strong",
      ".transaction-info small",
      ".pulse-day",
      ".pulse-footer",
    ]) {
      const size = await page
        .locator(selector)
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(size).toBeGreaterThanOrEqual(
        selector.includes("strong") ? 17 : 13,
      );
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const clipped = await page
      .locator(".transaction-info strong, .transaction-amount strong")
      .evaluateAll((elements) =>
        elements.some((el) => el.scrollWidth > el.clientWidth + 1),
      );
    expect(clipped).toBe(false);
    await page.screenshot({
      path: `test-results/readability-${theme}-320.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Manage accounts" }).click();
    await page
      .getByRole("button", { name: "Edit Family savings account" })
      .click();
    await expect(
      page.getByRole("button", { name: "Save account", exact: true }),
    ).toBeVisible();
    const saveBounds = await page
      .getByRole("button", { name: "Save account", exact: true })
      .boundingBox();
    expect(saveBounds!.y + saveBounds!.height).toBeLessThanOrEqual(640);
    await page.screenshot({
      path: `test-results/account-edit-${theme}-320.png`,
      fullPage: false,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page
      .getByRole("button", { name: "Add transaction", exact: true })
      .last()
      .click();
    const continueBounds = await page
      .getByRole("button", { name: "Continue", exact: true })
      .boundingBox();
    expect(continueBounds!.y + continueBounds!.height).toBeLessThanOrEqual(640);
    for (const selector of [
      ".keypad-actions > button",
      ".money-hero .money-field-label",
    ])
      expect(
        await page
          .locator(selector)
          .first()
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      ).toBeGreaterThanOrEqual(15);
    await page.screenshot({
      path: `test-results/record-${theme}-320.png`,
      fullPage: false,
      animations: "disabled",
    });
  });
