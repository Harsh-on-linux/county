import { test, expect, type Page } from "./fixtures";
import { initial } from "../src/domain";
async function prepare(page: Page, theme: "light" | "dark") {
  await page.addInitScript(
    ({ data, theme }) => {
      localStorage.setItem(
        "CapacitorStorage.county-data",
        JSON.stringify(data),
      );
      localStorage.setItem("county-appearance", theme);
      (window as any).openingFrames = [];
      (window as any).openingSamples = [];
      const sample = () => {
        const scene = document.querySelector<HTMLElement>(
          ".opening-screen:not(.opening-waiting)",
        );
        const coin = scene?.querySelector<HTMLElement>(".intro-coin");
        if (coin && scene?.dataset.phase === "rise") {
          const rect = coin.getBoundingClientRect();
          (window as any).openingSamples.push({
            top: rect.top,
            width: rect.width,
            height: rect.height,
            transform: getComputedStyle(coin).transform,
          });
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
      new MutationObserver((records) => {
        for (const record of records) {
          const el = record.target as HTMLElement;
          if (
            record.type === "attributes" &&
            record.attributeName === "data-phase" &&
            el.matches(".opening-screen")
          ) {
            const flight = el.querySelector(".intro-flight");
            const mark = el
              .querySelector(".intro-portal-mark")
              ?.getBoundingClientRect();
            // Mask children have no layout box. Use the unit star's SVG matrix.
            const aperture = el
              .querySelector<SVGPathElement>(".intro-aperture")
              ?.transform.baseVal.consolidate()?.matrix;
            (window as any).openingFrames.push({
              phase: el.dataset.phase,
              top: flight?.getBoundingClientRect().top,
              width: flight?.getBoundingClientRect().width,
              markLeft: mark?.left,
              markTop: mark?.top,
              markWidth: mark?.width,
              holeLeft: aperture ? aperture.e - aperture.a : undefined,
              holeTop: aperture ? aperture.f - aperture.d : undefined,
              holeWidth: aperture ? aperture.a * 2 : undefined,
            });
          }
        }
      }).observe(document, {
        attributes: true,
        subtree: true,
        attributeFilter: ["data-phase"],
      });
    },
    {
      data: {
        ...initial(),
        name: "Harsh",
        onboarded: true,
        theme,
        accounts: [{ id: "cash", name: "Cash", type: "cash", opening: 500000 }],
      },
      theme,
    },
  );
}
for (const theme of ["light", "dark"] as const)
  test(`opening has a flat ${theme} scene, a steady rise and a star reveal`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({
      colorScheme: theme === "dark" ? "light" : "dark",
    });
    await prepare(page, theme);
    await page.goto("/");
    const scene = page.locator(".opening-screen:not(.opening-waiting)");
    await expect(scene).toHaveAttribute("data-motion", "animejs");
    await expect(page.locator(".intro-curtain-fill")).toHaveCSS(
      "fill",
      theme === "dark" ? "rgb(14, 16, 16)" : "rgb(241, 239, 233)",
    );
    await expect(scene).toHaveCSS("background-image", "none");
    await expect(page.locator(".intro-front")).toHaveCSS(
      "background-image",
      "none",
    );
    await expect(page.locator(".intro-aperture")).toHaveAttribute(
      "d",
      /^M0 -1 A1 1/,
    );
    await scene.waitFor({ state: "hidden", timeout: 8000 });
    await expect(
      page.getByRole("heading", { name: "Hello, Harsh." }),
    ).toBeVisible();
    const frames = await page.evaluate(
      () =>
        (window as any).openingFrames as {
          phase: string;
          top: number;
          width: number;
          markLeft: number;
          markTop: number;
          markWidth: number;
          holeLeft: number;
          holeTop: number;
          holeWidth: number;
        }[],
    );
    const phases = frames.map((f) => f.phase);
    for (const phase of ["rise", "settle", "reveal"])
      expect(phases).toContain(phase);
    const rise = frames.find((f) => f.phase === "rise")!,
      settled = frames.find((f) => f.phase === "settle")!;
    expect(rise.top).toBeGreaterThan(settled.top + 200);
    expect(settled.top).toBeCloseTo(844 * 0.48 - 52, 0);
    const reveal = frames.find((f) => f.phase === "reveal")!;
    expect(reveal.markLeft).toBeCloseTo(reveal.holeLeft, 1);
    expect(reveal.markTop).toBeCloseTo(reveal.holeTop, 1);
    expect(reveal.markWidth).toBeCloseTo(reveal.holeWidth, 1);
    const samples = await page.evaluate(
      () =>
        (window as any).openingSamples as {
          top: number;
          width: number;
          height: number;
          transform: string;
        }[],
    );
    expect(samples.length).toBeGreaterThan(5);
    for (let i = 0; i < samples.length; i++) {
      expect(samples[i].width).toBeCloseTo(104, 1);
      expect(samples[i].height).toBeCloseTo(104, 1);
      expect(samples[i].transform).toBe("none");
      expect(samples[i].top).toBeGreaterThanOrEqual(settled.top - 0.1);
      if (i)
        expect(samples[i].top).toBeLessThanOrEqual(samples[i - 1].top + 0.1);
    }
    const visibleMarks = await page
      .locator(".brand-mark")
      .evaluateAll(
        (els) =>
          els.filter(
            (el) =>
              el.getClientRects().length > 0 &&
              getComputedStyle(el).visibility !== "hidden",
          ).length,
      );
    expect(visibleMarks).toBe(1);
    await expect(
      page.locator(
        ".daily-edition .brand-mark,.quiet-footer .brand-mark,.dock-record .brand-mark",
      ),
    ).toHaveCount(0);
    await page.screenshot({ path: `test-results/home-one-logo-${theme}.png` });
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: /Replay coin intro/ }).click();
    await expect(scene).toBeVisible();
    await page.getByRole("button", { name: "Skip intro" }).click();
    await expect(scene).toHaveCount(0);
    await expect(page.locator(".balance-amount")).toContainText("5,000.00");
  });
test("reduced motion skips the rise and replay can be interrupted without changing records", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await prepare(page, "dark");
  await page.goto("/");
  await expect(page.locator(".opening-screen")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Hello, Harsh." }),
  ).toBeVisible();
  let phases = await page.evaluate(() =>
    (window as any).openingFrames.map((f: any) => f.phase),
  );
  expect(phases).toContain("reduced");
  expect(phases).not.toContain("rise");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: /Replay coin intro/ }).click();
  await expect(page.locator(".opening-screen")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".opening-screen")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("group", { name: "County number pad" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator(".balance-amount")).toContainText("5,000.00");
});
