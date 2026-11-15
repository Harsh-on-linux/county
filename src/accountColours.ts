import type { Account } from "./domain";

export const accountColours = [
  { id: "sage", label: "Sage" },
  { id: "blue", label: "Blue" },
  { id: "teal", label: "Teal" },
  { id: "lilac", label: "Lilac" },
  { id: "peach", label: "Peach" },
  { id: "rose", label: "Rose" },
  { id: "amber", label: "Amber" },
  { id: "coral", label: "Coral" },
  { id: "slate", label: "Slate" },
] as const;

export function defaultAccountColour(type: Account["type"]) {
  return { bank: "blue", cash: "sage", wallet: "teal", card: "lilac" }[type];
}

export function accountColour(account: Account) {
  return !account.color || account.color === "sand"
    ? defaultAccountColour(account.type)
    : account.color;
}

/** Prefer a type's colour, then an unused shade for additional accounts. */
export function newAccountColour(
  type: Account["type"],
  accounts: Account[] = [],
) {
  const preferred = defaultAccountColour(type);
  const used = new Set(accounts.map(accountColour));
  return (
    [preferred, ...accountColours.map((colour) => colour.id)].find(
      (colour) => !used.has(colour),
    ) || preferred
  );
}
