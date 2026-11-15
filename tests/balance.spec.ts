import { test, expect, type Page } from "./fixtures";
import { initial } from "../src/domain";

async function prepare(page: Page, theme: "light" | "dark") {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    (data) => {
      localStorage.setItem(
        "CapacitorStorage.county-data",
        JSON.stringify(data),
      );
      localStorage.setItem("county-appearance", data.theme);
    },
    {
      ...initial(),
      theme,
      name: "Harsh",
      onboarded: true,
      accounts: [
        { id: "cash", name: "Everyday money", type: "cash", opening: 4850000 },
      ],
    },
  );
  await page.goto("/");
  await expect(page.locator(".opening-screen")).toHaveCount(0);
}

for (const theme of ["light", "dark"] as const) {
  test(`${theme} card flows without moving the balance and pauses behind dialogs and offscreen`, async ({
    page,
  }) => {
    await prepare(page, theme);
    const flow = page.locator(".balance-flow"),
      ribbon = page.locator(".balance-flow-ribbon"),
      amount = page.locator(".balance-amount");
    await expect(flow).toHaveAttribute("data-running", "true");
    const before = await amount.boundingBox();
    const transform = await ribbon.evaluate(
      (el) => getComputedStyle(el).transform,
    );
    await expect
      .poll(() => ribbon.evaluate((el) => getComputedStyle(el).transform))
      .not.toBe(transform);
    await expect(amount).toHaveText("₹48,500.00");
    expect(await amount.boundingBox()).toEqual(before);
    await page.getByRole("button", { name: "Manage accounts" }).click();
    await expect(flow).toHaveAttribute("data-running", "false");
    await expect(ribbon).toHaveCSS("animation-play-state", "paused");
    await page.getByRole("button", { name: "Close dialog" }).click();
    await expect(flow).toHaveAttribute("data-running", "true");
    await page.setViewportSize({ width: 390, height: 360 });
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await expect(flow).toHaveAttribute("data-running", "false");
    await flow.scrollIntoViewIfNeeded();
    await expect(flow).toHaveAttribute("data-running", "true");
  });
}

test("reduced motion keeps the money card static and usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await prepare(page, "dark");
  await expect(page.locator(".balance-flow")).toHaveAttribute(
    "data-running",
    "false",
  );
  await expect(page.locator(".balance-flow-ribbon")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".balance-amount")).toHaveText("₹48,500.00");
  await page.getByRole("button", { name: "Manage accounts" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
