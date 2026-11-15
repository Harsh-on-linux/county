import { expect, test, type Page } from "@playwright/test";
import { initial } from "../src/domain";

const owner = "10000000-0000-4000-8000-000000000001";
const mom = "10000000-0000-4000-8000-000000000002";
const invitation = "abcdef1234567890abcdef1234567890";

async function familyApp(
  page: Page,
  existingOwner?: string,
  firstRun?: "tour" | "signin",
) {
  if (existingOwner)
    await page.addInitScript(
      (id) => localStorage.setItem("CapacitorStorage.county-device-owner", id),
      existingOwner,
    );
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
      name: firstRun ? "" : "Harsh",
      onboarded: !firstRun,
      accounts: firstRun
        ? []
        : [{ id: "cash", name: "Cash", type: "cash", opening: 500000 }],
    },
  );
  const user = {
    id: owner,
    email: "county-test@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  let household: { id: string; name: string; owner: string } | null = null;
  let members: { user_id: string; name: string }[] = [];
  let revision = 0;
  const calls: { name: string; args: any }[] = [];
  await page.route("http://127.0.0.1:54321/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    const args = req.postDataJSON() || {};
    const send = (value: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(value),
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
      });
    if (req.method() === "OPTIONS") return send({});
    if (path.endsWith("/otp")) {
      calls.push({ name: "otp", args });
      return send({});
    }
    if (path.endsWith("/logout")) return send({});
    if (path.endsWith("/verify")) {
      if (args.token !== "12345678")
        return send(
          {
            message: "That email code is not valid.",
            error_code: "otp_expired",
          },
          403,
        );
      const now = Math.floor(Date.now() / 1000),
        payload = Buffer.from(
          JSON.stringify({
            sub: owner,
            aud: "authenticated",
            exp: now + 3600,
            iat: now,
          }),
        ).toString("base64url");
      return send({
        access_token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.test`,
        refresh_token: "local-test-refresh",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: now + 3600,
        user,
      });
    }
    if (path.endsWith("/user")) return send(user);
    const name = path.split("/").at(-1)!;
    calls.push({ name, args });
    if (name === "household_snapshot")
      return send({ household, members, entries: [] });
    if (name === "save_backup") return send(++revision);
    if (name === "get_backup") return send(null);
    if (name === "create_household") {
      household = { id: "family", name: args.household_name, owner };
      members = [
        { user_id: owner, name: args.member_name },
        { user_id: mom, name: "Mom" },
      ];
      return send("family");
    }
    if (name === "create_invite") return send(invitation);
    if (name === "accept_invite") {
      if (args.invite_code !== invitation)
        return send(
          {
            message: "Invitation is invalid, expired, or already used",
            code: "P0001",
          },
          400,
        );
      household = { id: "joined", name: "Our family", owner: mom };
      members = [
        { user_id: mom, name: "Mom" },
        { user_id: owner, name: args.member_name },
      ];
      return send(null);
    }
    if (name === "remove_member") {
      members = members.filter((m) => m.user_id !== args.member_id);
      return send(null);
    }
    return send({ message: `Unexpected request: ${path}` }, 400);
  });
  await page.goto("/");
  await page.locator(".opening-screen").waitFor({ state: "hidden" });
  if (firstRun) {
    await expect(
      page.getByRole("heading", { name: "Your money. In a good place." }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Your email" })).toHaveCount(
      0,
    );
    expect(calls).toEqual([]);
    if (firstRun === "signin") {
      await page
        .getByRole("button", { name: "Already use County? Sign in" })
        .click();
    } else {
      await page.getByRole("button", { name: "Find your clarity" }).click();
      await page
        .getByRole("button", { name: "Make it yours", exact: true })
        .click();
      await page.getByPlaceholder("Your first name").fill("Harsh");
      await page.getByRole("button", { name: "Create my space" }).click();
      await expect(
        page.getByRole("heading", { name: "Your space is ready, Harsh." }),
      ).toBeVisible();
      await page.screenshot({
        path: "test-results/onboarding-before-email.png",
        animations: "disabled",
      });
      expect(calls).toEqual([]);
      await expect(page.locator(".balance-amount")).toHaveCount(0);
      await page.getByRole("button", { name: "Continue with email" }).click();
      await page.screenshot({
        path: "test-results/signin-after-onboarding.png",
        animations: "disabled",
      });
    }
  }
  await expect(
    page.getByRole("heading", { name: /Your money\..*Your account\./ }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Your email" }).fill(user.email);
  await page.getByRole("button", { name: "Send sign-in code" }).click();
  await page.getByRole("textbox", { name: "Email code" }).fill("11111111");
  await page.getByRole("button", { name: "Verify code" }).click();
  await expect(page.getByRole("alert")).toContainText("not valid");
  await page.getByRole("textbox", { name: "Email code" }).fill("12345678");
  await page.getByRole("button", { name: "Verify code" }).click();
  if (existingOwner) {
    await expect(page.getByRole("alert")).toContainText(
      "These records belong to another account",
    );
    return calls;
  }
  if (firstRun === "signin") {
    await expect(page.getByPlaceholder("Your first name")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Find your clarity" }),
    ).toHaveCount(0);
    await page.getByPlaceholder("Your first name").fill("Harsh");
    await page.getByRole("button", { name: "Create my space" }).click();
    await page.getByRole("button", { name: "Open my space" }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Hello, Harsh." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Navigate County" }).click();
  await page.getByRole("button", { name: "Household", exact: true }).click();
  await page.getByRole("button", { name: "Connect your family" }).click();
  await expect(
    page.getByRole("button", { name: /Create a family/ }),
  ).toBeVisible();
  return calls;
}

test("a new user completes onboarding before email verification and records remain gated", async ({
  page,
}) => {
  const calls = await familyApp(page, undefined, "tour");
  expect(calls.filter((c) => c.name === "otp")).toHaveLength(1);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("CapacitorStorage.county-device-owner"),
    ),
  ).toBe(owner);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hello, Harsh." }),
  ).toBeVisible();
});

test("returning users can sign in directly and skip the introductory tour", async ({
  page,
}) => {
  await familyApp(page, undefined, "signin");
});

test("existing local records cannot be exposed through unfinished onboarding", async ({
  page,
}) => {
  await page.addInitScript(
    (data) =>
      localStorage.setItem(
        "CapacitorStorage.county-data",
        JSON.stringify(data),
      ),
    {
      ...initial(),
      onboarded: false,
      accounts: [
        { id: "bank", name: "Private savings", type: "bank", opening: 9900000 },
      ],
    },
  );
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Your email" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Find your clarity" }),
  ).toHaveCount(0);
  await expect(page.getByText("Private savings", { exact: true })).toHaveCount(
    0,
  );
});

test("family sign-in, creation, invitation, and member removal have a continuous flow", async ({
  page,
}) => {
  const calls = await familyApp(page);
  await page.getByRole("button", { name: /Create a family/ }).click();
  await page.getByRole("textbox", { name: "Family name" }).fill("Our home");
  await page
    .getByRole("button", { name: "Create family", exact: true })
    .click();
  await expect(page.locator(".family-members")).toContainText("Mom");
  await page.getByRole("button", { name: "Invite a family member" }).click();
  await expect(
    page.getByRole("textbox", { name: "Family invitation code" }),
  ).toHaveValue(invitation);
  await page.screenshot({ path: "test-results/family-invitation.png" });
  await page.getByRole("button", { name: "Remove Mom" }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".family-members")).toContainText("Mom");
  await page.getByRole("button", { name: "Remove Mom" }).click();
  await page
    .getByRole("button", { name: "Remove member", exact: true })
    .click();
  await expect(page.locator(".family-members")).not.toContainText("Mom");
  expect(calls.find((c) => c.name === "create_household")?.args).toEqual({
    household_name: "Our home",
    member_name: "Harsh",
  });
});

test("joining validates the code, explains an expired invite, and connects the member", async ({
  page,
}) => {
  await familyApp(page);
  await page.getByRole("button", { name: /Join a family/ }).click();
  await page.getByRole("textbox", { name: "Invitation code" }).fill("short");
  await page.getByRole("button", { name: "Join family", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("32-character");
  await page
    .getByRole("textbox", { name: "Invitation code" })
    .fill("0".repeat(32));
  await page.getByRole("button", { name: "Join family", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("expired");
  await page
    .getByRole("textbox", { name: "Invitation code" })
    .fill(invitation.toUpperCase());
  await page.getByRole("button", { name: "Join family", exact: true }).click();
  await expect(page.locator(".family-members")).toContainText("Mom");
  await expect(
    page.getByRole("button", { name: "Invite a family member" }),
  ).toHaveCount(0);
});

test("OTP sign-in persists across reopening, while sign-out requires authentication again", async ({
  page,
  context,
}) => {
  await familyApp(page);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hello, Harsh." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Your money\..*Your account\./ }),
  ).toBeVisible();
  await context.setOffline(true);
  await expect(
    page.getByText("Connect to the internet to sign in for the first time.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Hello, Harsh." }),
  ).toHaveCount(0);
});

test("another person's OTP cannot attach this phone's existing records to their account", async ({
  page,
}) => {
  await familyApp(page, mom);
  await expect(
    page.getByRole("heading", { name: /Your money\..*Your account\./ }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("CapacitorStorage.county-device-owner"),
    ),
  ).toBe(mom);
});
