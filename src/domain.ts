export type Account = {
  id: string;
  name: string;
  type: "bank" | "cash" | "card" | "wallet";
  opening: number;
};
export type Entry = {
  id: string;
  type: "expense" | "income" | "transfer" | "adjustment";
  amount: number;
  account: string;
  to?: string;
  category: string;
  payee: string;
  note: string;
  date: string;
  shared: boolean;
  deleted?: boolean;
  updated: string;
  smsId?: string;
};
export type Suggestion = {
  id: string;
  amount: number;
  type: "expense" | "income";
  payee: string;
  date: string;
  reference?: string;
  dismissed?: boolean;
};
export type Data = {
  version: 1;
  name: string;
  accounts: Account[];
  entries: Entry[];
  categories: string[];
  suggestions: Suggestion[];
  seenSms: string[];
  theme: "system" | "light" | "dark";
  onboarded: boolean;
  lock: boolean;
  lastBackup?: string;
  sharedEdits?: SharedEntry[];
};
export type SharedEntry = {
  id: string;
  creator: string;
  payer: string;
  payload: Entry;
  revision: number;
};
export function householdLedger(
  data: Data,
  remote: SharedEntry[],
  user: string | null,
  connected: boolean,
) {
  if (!connected)
    return data.entries
      .filter((e) => e.shared && !e.deleted)
      .map((e) => ({ ...e, payer: data.name }));
  return remote
    .map((s) => {
      const queued = data.sharedEdits?.find((e) => e.id === s.id);
      const local =
        s.creator === user
          ? data.entries.find((e) => e.id === s.id)
          : undefined;
      return { ...(queued?.payload || local || s.payload), payer: s.payer };
    })
    .concat(
      data.entries
        .filter((e) => e.shared && !remote.some((s) => s.id === e.id))
        .map((e) => ({ ...e, payer: data.name })),
    )
    .filter((e) => e.shared && !e.deleted);
}
export const uid = () => crypto.randomUUID();
export const today = () => new Date().toLocaleDateString("en-CA");
export const money = (paise: number, decimals = false) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(paise / 100);
export const initial = (): Data => ({
  version: 1,
  name: "",
  accounts: [],
  entries: [],
  categories: [
    "Food & drinks",
    "Groceries",
    "Shopping",
    "Transport",
    "Bills & utilities",
    "Health",
    "Entertainment",
    "Family",
    "Salary",
    "Other",
  ],
  suggestions: [],
  seenSms: [],
  theme: "system",
  onboarded: false,
  lock: false,
});
export function amountOf(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error("Enter a positive amount with at most two decimal places.");
  const amount = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1e12)
    throw new Error("Enter an amount between ₹0.01 and ₹10,00,00,00,000.");
  return amount;
}
export function validateEntry(e: Entry, accounts: Account[]) {
  if (
    !Number.isSafeInteger(e.amount) ||
    (e.type === "adjustment" ? e.amount === 0 : e.amount <= 0)
  )
    throw new Error("Amount must be positive.");
  if (!accounts.some((a) => a.id === e.account))
    throw new Error("Choose an account.");
  if (
    e.type === "transfer" &&
    (e.account === e.to || !accounts.some((a) => a.id === e.to))
  )
    throw new Error("Choose a different destination account.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(e.date) ||
    Number.isNaN(Date.parse(e.date)) ||
    new Date(e.date).toISOString().slice(0, 10) !== e.date
  )
    throw new Error("Choose a valid date.");
  if (e.type !== "expense" && e.shared)
    throw new Error("Only expenses can be shared.");
}
export function balance(a: Account, entries: Entry[]) {
  return (
    a.opening +
    entries
      .filter((e) => !e.deleted)
      .reduce(
        (sum, e) =>
          sum +
          (e.account === a.id
            ? e.type === "income" || e.type === "adjustment"
              ? e.amount
              : -e.amount
            : 0) +
          (e.type === "transfer" && e.to === a.id ? e.amount : 0),
        0,
      )
  );
}
export function monthEntries(entries: Entry[], month: string) {
  return entries.filter((e) => !e.deleted && e.date.startsWith(month));
}
export function totals(entries: Entry[]) {
  return entries
    .filter((e) => !e.deleted)
    .reduce(
      (r, e) => ({
        expense: r.expense + (e.type === "expense" ? e.amount : 0),
        income: r.income + (e.type === "income" ? e.amount : 0),
      }),
      { expense: 0, income: 0 },
    );
}
export function breakdown(entries: Entry[]) {
  const categories = new Map<string, number>();
  entries
    .filter((e) => e.type === "expense" && !e.deleted)
    .forEach((e) =>
      categories.set(e.category, (categories.get(e.category) || 0) + e.amount),
    );
  return [...categories].sort((a, b) => b[1] - a[1]);
}
export function parseSms(
  id: string,
  body: string,
  timestamp: number,
): Suggestion | null {
  if (
    /\b(otp|one.time.password|failed|declined|unsuccessful|reversed|reversal|due|reminder|offer|limit|requested|request to pay)\b/i.test(
      body,
    )
  )
    return null;
  const type = /\b(credited|received|deposited)\b/i.test(body)
    ? "income"
    : /\b(debited|spent|paid|withdrawn|sent)\b/i.test(body)
      ? "expense"
      : null;
  const amount = body.match(/(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!type || !amount) return null;
  const value = Math.round(Number(amount[1].replaceAll(",", "")) * 100);
  if (!Number.isSafeInteger(value) || value <= 0) return null;
  const payee =
    body
      .match(
        /(?:\bat|\bto|\bfrom)\s+([a-z][a-z0-9 .@_-]{1,40}?)(?=\s+(?:on|ref|upi|avl|bal|via|using)|[.;]|$)/i,
      )?.[1]
      ?.trim() || "Bank transaction";
  const reference = body.match(
    /(?:ref(?:erence)?(?:\s*no)?|utr)\s*[:.#-]?\s*([a-z0-9]{6,})/i,
  )?.[1];
  return {
    id,
    amount: value,
    type,
    payee,
    date: new Date(timestamp).toLocaleDateString("en-CA"),
    reference,
  };
}
export function duplicate(s: Suggestion, entries: Entry[]) {
  return entries.find(
    (e) =>
      !e.deleted &&
      (e.smsId === s.id ||
        (e.type === s.type && e.amount === s.amount && e.date === s.date)),
  );
}
export function csv(entries: Entry[], accounts: Account[]) {
  const cell = (v: string) =>
    '"' + (/^[=+\-@\t\r]/.test(v) ? "'" + v : v).replaceAll('"', '""') + '"';
  return (
    "\uFEFF" +
    [
      [
        "Date",
        "Type",
        "Amount (INR)",
        "Account",
        "Destination",
        "Category",
        "Payee",
        "Note",
        "Household",
      ],
      ...entries
        .filter((e) => !e.deleted)
        .map((e) => [
          e.date,
          e.type,
          (e.amount / 100).toFixed(2),
          accounts.find((a) => a.id === e.account)?.name || "",
          accounts.find((a) => a.id === e.to)?.name || "",
          e.category,
          e.payee,
          e.note,
          e.shared ? "Yes" : "No",
        ]),
    ]
      .map((r) => r.map(cell).join(","))
      .join("\r\n")
  );
}
export function readBackup(raw: string): Data {
  const d = JSON.parse(raw);
  if (
    d?.sharedEdits !== undefined &&
    (!Array.isArray(d.sharedEdits) ||
      d.sharedEdits.some(
        (s: SharedEntry) =>
          !s ||
          typeof s.id !== "string" ||
          !Number.isInteger(s.revision) ||
          !s.payload ||
          s.payload.type !== "expense" ||
          !Number.isSafeInteger(s.payload.amount) ||
          s.payload.amount <= 0 ||
          typeof s.payload.payee !== "string" ||
          typeof s.payload.category !== "string" ||
          typeof s.payload.note !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(s.payload.date),
      ))
  )
    throw new Error("Invalid pending household changes.");
  if (
    !d ||
    d.version !== 1 ||
    typeof d.name !== "string" ||
    !Array.isArray(d.accounts) ||
    !Array.isArray(d.entries) ||
    !Array.isArray(d.categories) ||
    !Array.isArray(d.suggestions) ||
    !Array.isArray(d.seenSms) ||
    !["system", "light", "dark"].includes(d.theme) ||
    typeof d.onboarded !== "boolean" ||
    typeof d.lock !== "boolean"
  )
    throw new Error("This is not a valid County v1 backup.");
  const ids = new Set<string>();
  for (const a of d.accounts) {
    if (
      typeof a.id !== "string" ||
      ids.has(a.id) ||
      typeof a.name !== "string" ||
      !["bank", "cash", "card", "wallet"].includes(a.type) ||
      !Number.isSafeInteger(a.opening)
    )
      throw new Error("Invalid account in backup.");
    ids.add(a.id);
  }
  ids.clear();
  for (const e of d.entries) {
    if (
      typeof e.id !== "string" ||
      ids.has(e.id) ||
      !["expense", "income", "transfer", "adjustment"].includes(e.type) ||
      typeof e.category !== "string" ||
      typeof e.payee !== "string" ||
      typeof e.note !== "string" ||
      typeof e.shared !== "boolean" ||
      !Number.isFinite(Date.parse(e.updated)) ||
      (e.deleted !== undefined && typeof e.deleted !== "boolean")
    )
      throw new Error("Invalid transaction in backup.");
    validateEntry(e, d.accounts);
    ids.add(e.id);
  }
  if (
    !d.categories.every(
      (c: unknown) => typeof c === "string" && c.length > 0,
    ) ||
    !d.seenSms.every((s: unknown) => typeof s === "string")
  )
    throw new Error("Invalid categories or SMS history.");
  for (const s of d.suggestions)
    if (
      typeof s.id !== "string" ||
      !Number.isSafeInteger(s.amount) ||
      s.amount <= 0 ||
      !["expense", "income"].includes(s.type) ||
      typeof s.payee !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(s.date)
    )
      throw new Error("Invalid SMS suggestion.");
  return d as Data;
}
