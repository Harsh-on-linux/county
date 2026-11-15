import { Check } from "lucide-react";
import { BurstMark } from "./BurstMark";
import { accountColours } from "../accountColours";
export { accountColour } from "../accountColours";
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
