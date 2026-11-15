import { expect, test, type Page } from "@playwright/test";
import { initial, type Data } from "../src/domain";
import { setMoney } from "./helpers";

const owner = "10000000-0000-4000-8000-000000000001";
const mom = "10000000-0000-4000-8000-000000000002";
const invitation = "abcdef1234567890abcdef1234567890";
type BackupBackend = {
  backup: { payload: Data; revision: number } | null;
  readError?: boolean;
  householdError?: boolean;
  stopAfterVerify?: boolean;
};

async function familyApp(
  page: Page,
  existingOwner?: string,
  firstRun?: "tour" | "signin",
  backend?: BackupBackend,
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
    if (name === "household_snapshot" && backend?.householdError)
      return send(
        { code: "PGRST202", message: "Household sync is unavailable" },
        404,
      );
    if (name === "household_snapshot")
      return send({ household, members, entries: [] });
    if (name === "save_backup") {
      if (backend) {
        const previous = backend.backup?.revision || 0;
        if (args.expected_revision !== previous)
          return send(
            { code: "P0001", message: "A newer cloud backup exists." },
            400,
          );
        backend.backup = {
          payload: structuredClone(args.snapshot),
          revision: previous + 1,
        };
        return send(previous + 1);
      }
      return send(++revision);
    }
    if (name === "get_backup")
      return backend?.readError
        ? send(
            {
              code: "PGRST202",
              message:
                "Could not find the function public.get_backup in the schema cache",
            },
            404,
          )
        : send(backend?.backup || null);
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
  if (backend?.stopAfterVerify) return calls;
  if (firstRun === "signin" && !backend?.backup) {
    await expect(
      page.getByRole("heading", { name: "No saved backup found." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Set up this phone" }).click();
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

test("a fresh install restores saved banks after OTP and keeps the backup revision across reopening", async ({
  page,
  browser,
}) => {
  const backend: BackupBackend = { backup: null };
  await familyApp(page, undefined, undefined, backend);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Navigate County" }).click();
  await page
    .locator(".dock-destinations")
    .getByRole("button", { name: "Home", exact: true })
    .click();
  await page.getByRole("button", { name: "Add account", exact: true }).click();
  await page.getByLabel("Account name", { exact: true }).fill("Family savings");
  await setMoney(page, "Current balance (₹)", "12345.67");
  await page
    .getByRole("button", { name: "Add account", exact: true })
    .last()
    .click();
  await expect
    .poll(() =>
      backend.backup?.payload.accounts.some(
        (account) => account.name === "Family savings",
      ),
    )
    .toBe(true);
  const saved = structuredClone(backend.backup!);
  const replacement = await browser.newContext({
    baseURL: "http://127.0.0.1:4174",
  });
  try {
    const phone = await replacement.newPage();
    const calls = await familyApp(phone, undefined, "signin", backend);
    await expect(phone.getByPlaceholder("Your first name")).toHaveCount(0);
    await phone.getByRole("button", { name: "Close dialog" }).click();
    await phone.getByRole("button", { name: "Navigate County" }).click();
    await phone
      .locator(".dock-destinations")
      .getByRole("button", { name: "Home", exact: true })
      .click();
    await expect(
      phone.locator(".account-card").filter({ hasText: "Family savings" }),
    ).toContainText("12,345.67");
    expect(calls.filter((call) => call.name === "save_backup")).toHaveLength(0);
    expect(
      await phone.evaluate(
        (id) =>
          localStorage.getItem("CapacitorStorage.county-backup-revision-" + id),
        owner,
      ),
    ).toBe(String(saved.revision));
    await phone.reload();
    await expect(
      phone.locator(".account-card").filter({ hasText: "Family savings" }),
    ).toContainText("12,345.67");
    await phone.getByRole("button", { name: "Manage accounts" }).click();
    await phone.getByRole("button", { name: "Edit Family savings" }).click();
    await phone.getByRole("button", { name: "Teal", exact: true }).click();
    await phone
      .getByRole("button", { name: "Save account", exact: true })
      .click();
    await expect
      .poll(
        () =>
          backend.backup?.payload.accounts.find(
            (account) => account.name === "Family savings",
          )?.color,
      )
      .toBe("teal");
    const writes = calls.filter((call) => call.name === "save_backup");
    expect(writes[0].args.expected_revision).toBe(saved.revision);
    expect(writes.at(-1)!.args.expected_revision).toBe(
      backend.backup!.revision - 1,
    );
    expect(backend.backup!.revision).toBe(saved.revision + writes.length);
    expect(backend.backup!.payload.accounts).toHaveLength(
      saved.payload.accounts.length,
    );
  } finally {
    await replacement.close();
  }
});

test("failed recovery can be retried after reopening without uploading a replacement setup", async ({
  page,
}) => {
  const remote = {
    ...initial(),
    onboarded: true,
    name: "Harsh",
    accounts: [
      {
        id: "old-bank",
        name: "Saved bank",
        type: "bank" as const,
        opening: 850000,
      },
    ],
  };
  const backend: BackupBackend = {
    backup: { payload: remote, revision: 7 },
    readError: true,
    stopAfterVerify: true,
  };
  const calls = await familyApp(page, undefined, "tour", backend);
  await expect(
    page.getByRole("heading", { name: "Let’s reconnect." }),
  ).toBeVisible();
  await expect(page.locator(".balance-amount")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Let’s reconnect." }),
  ).toBeVisible();
  expect(calls.filter((call) => call.name === "save_backup")).toHaveLength(0);
  expect(backend.backup).toEqual({ payload: remote, revision: 7 });
  backend.readError = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "Your saved space." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/account-recovery-choice.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Restore saved space" }).click();
  await expect(page.locator(".account-card")).toContainText("Saved bank");
  await expect(page.locator(".balance-amount")).toContainText("8,500.00");
  expect(calls.filter((call) => call.name === "save_backup")).toHaveLength(0);
});

test("keeping a new phone's setup protects the saved copy until cloud restore is confirmed", async ({
  page,
}) => {
  const remote = {
    ...initial(),
    onboarded: true,
    name: "Harsh",
    accounts: [
      {
        id: "old-bank",
        name: "Saved bank",
        type: "bank" as const,
        opening: 850000,
      },
    ],
  };
  const backend: BackupBackend = {
    backup: { payload: remote, revision: 3 },
    stopAfterVerify: true,
  };
  const calls = await familyApp(page, undefined, "tour", backend);
  await page.getByRole("button", { name: "Keep this phone’s data" }).click();
  await expect(
    page.getByText("Cloud backup paused", { exact: true }),
  ).toBeVisible();
  expect(calls.filter((call) => call.name === "save_backup")).toHaveLength(0);
  expect(backend.backup).toEqual({ payload: remote, revision: 3 });
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Backups", exact: true }).click();
  await expect(
    page.getByText(/Cloud backup is paused to protect your saved copy/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restore cloud backup" }).click();
  await page
    .getByRole("button", { name: "Replace records", exact: true })
    .click();
  await expect(page.locator(".account-card")).toContainText("Saved bank");
  expect(
    await page.evaluate(
      (id) =>
        localStorage.getItem("CapacitorStorage.county-backup-revision-" + id),
      owner,
    ),
  ).toBe("3");
  expect(
    await page.evaluate(
      (id) =>
        localStorage.getItem("CapacitorStorage.county-backup-paused-" + id),
      owner,
    ),
  ).toBeNull();
});

test("returning users can sign in directly and skip the introductory tour", async ({
  page,
}) => {
  await familyApp(page, undefined, "signin");
});

test("private account backup is saved even when household sync cannot run", async ({
  page,
}) => {
  const backend: BackupBackend = {
    backup: null,
    householdError: true,
    stopAfterVerify: true,
  };
  await familyApp(page, undefined, undefined, backend);
  await expect(
    page.getByRole("heading", { name: "Hello, Harsh." }),
  ).toBeVisible();
  await expect
    .poll(() => backend.backup?.payload.accounts[0]?.name)
    .toBe("Cash");
  expect(backend.backup!.payload.accounts[0].opening).toBe(500000);
  await expect(
    page.getByText("Household sync is unavailable", { exact: true }),
  ).toBeVisible();
});

test("a missing cloud copy is explained and an imported backup is saved back to the account", async ({
  page,
}) => {
  const backend: BackupBackend = { backup: null, stopAfterVerify: true };
  await familyApp(page, undefined, "signin", backend);
  await expect(
    page.getByRole("heading", { name: "No saved backup found." }),
  ).toBeVisible();
  await expect(
    page.getByText(/Reinstalling removes records stored only on the phone/),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "No saved backup found." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/account-recovery-missing.png",
    fullPage: true,
  });
  const snapshot = {
    ...initial(),
    onboarded: true,
    name: "Harsh",
    accounts: [
      {
        id: "imported",
        name: "Imported savings",
        type: "bank" as const,
        opening: 450000,
      },
    ],
  };
  await page.locator(".recovery-import input").setInputFiles({
    name: "County-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(snapshot)),
  });
  await expect(page.locator(".account-card")).toContainText("Imported savings");
  await expect(page.locator(".balance-amount")).toContainText("4,500.00");
  await expect
    .poll(() => backend.backup?.payload.accounts[0]?.name)
    .toBe("Imported savings");
  expect(backend.backup!.revision).toBe(1);
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
  await page.getByRole("tab", { name: "Account", exact: true }).click();
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
