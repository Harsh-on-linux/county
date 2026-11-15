import type { Page } from "@playwright/test";
export async function setMoney(page: Page, label: string, value: string) {
  await page.getByRole("textbox", { name: label, exact: true }).click();
  const pad = page.getByRole("group", { name: "County number pad" });
  await pad.getByRole("button", { name: "Clear", exact: true }).click();
  for (const digit of value)
    await pad
      .getByRole("button", {
        name: digit === "." ? "Decimal point" : digit,
        exact: true,
      })
      .click();
  await pad
    .getByRole("button", {
      name: label === "Amount in INR" ? "Continue" : "Use amount",
      exact: true,
    })
    .click();
}
export async function choose(page: Page, label: string, option: string) {
  if (
    !(await page
      .getByRole("combobox", { name: label, exact: true })
      .isVisible()) &&
    (await page.getByRole("button", { name: /^Filters/ }).isVisible())
  )
    await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
export async function startCounty(page: Page, name = "Harsh") {
  await page.goto("/");
  await page.getByRole("button", { name: "Find your clarity" }).click();
  await page
    .getByRole("button", { name: "Make it yours", exact: true })
    .click();
  await page.getByPlaceholder("Your first name").fill(name);
  await page.getByRole("button", { name: "Create my space" }).click();
  await page.getByRole("button", { name: "Open my space" }).click();
}
