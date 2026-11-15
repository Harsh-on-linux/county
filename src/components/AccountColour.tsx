import { Check } from "lucide-react";
import { BurstMark } from "./BurstMark";
import type { Account } from "../domain";
export const accountColour = (account: Account) =>
  account.color || (account.type === "card" ? "peach" : "sand");
export const accountColours = [
  { id: "sage", label: "Sage" },
  { id: "blue", label: "Blue" },
  { id: "lilac", label: "Lilac" },
  { id: "peach", label: "Peach" },
  { id: "rose", label: "Rose" },
  { id: "sand", label: "Sand" },
] as const;
export function AccountColour({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="account-colours">
      <legend>Account colour</legend>
      <div>
        {accountColours.map((c) => (
          <button
            type="button"
            key={c.id}
            data-account-colour={c.id}
            aria-label={c.label}
            aria-pressed={value === c.id}
            onClick={() => onChange(c.id)}
          >
            <BurstMark />
            <span>{c.label}</span>
            {value === c.id && <Check size={16} />}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
