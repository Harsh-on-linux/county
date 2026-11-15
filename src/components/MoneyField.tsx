import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, Delete, X } from "lucide-react";

export function moneyKey(value: string, key: string): string {
  if (key === "clear") return "";
  if (key === "backspace") return value.slice(0, -1);
  if (key === ".") return value.includes(".") ? value : (value || "0") + ".";
  if (!/^\d$/.test(key)) return value;
  const next = value === "0" ? key : value + key;
  if (next.split(".")[0].length > 11 || (next.split(".")[1]?.length || 0) > 2)
    return value;
  return next;
}
function format(value: string) {
  if (!value) return "";
  const [whole, fraction] = value.split(".");
  return (
    Number(whole || 0).toLocaleString("en-IN") +
    (fraction !== undefined ? "." + fraction : "")
  );
}

export function MoneyField({
  label,
  name,
  defaultValue = "",
  value,
  onChange,
  autoOpen = false,
  onConfirm,
  confirmLabel = "Use amount",
  hero = false,
  disabled = false,
}: {
  label: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  autoOpen?: boolean;
  onConfirm?: () => boolean | void;
  confirmLabel?: string;
  hero?: boolean;
  disabled?: boolean;
}) {
  const id = useId(),
    [local, setLocal] = useState(defaultValue),
    [open, setOpen] = useState(autoOpen),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const raw = value ?? local;
  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);
  function update(v: string) {
    setError("");
    if (onChange) onChange(v);
    else setLocal(v);
  }
  function press(key: string) {
    update(moneyKey(raw, key));
  }
  function done() {
    if (onConfirm?.() !== false) setOpen(false);
  }
  return (
    <div
      className={
        "money-field " +
        (hero ? "money-hero " : "") +
        (open ? "keypad-open" : "")
      }
    >
      <label className="money-field-label" htmlFor={id}>
        {hero ? "Amount" : label}
        <span>INR</span>
      </label>
      <div className="money-display">
        <span aria-hidden="true">₹</span>
        <input
          id={id}
          ref={input}
          aria-label={label}
          aria-expanded={open}
          aria-controls={id + "-pad"}
          inputMode="none"
          readOnly
          value={format(raw)}
          placeholder="0.00"
          disabled={disabled}
          style={
            hero && format(raw).length > 10
              ? { fontSize: Math.max(25, 48 - (format(raw).length - 10) * 3.5) }
              : undefined
          }
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.ctrlKey || e.metaKey) {
              if (e.key.toLowerCase() === "a") return;
              return;
            }
            if (/^\d$/.test(e.key) || e.key === ".") {
              e.preventDefault();
              const selected =
                input.current?.selectionStart === 0 &&
                input.current?.selectionEnd === format(raw).length;
              update(moneyKey(selected ? "" : raw, e.key));
            } else if (e.key === "Backspace") {
              e.preventDefault();
              const selected =
                input.current?.selectionStart === 0 &&
                input.current?.selectionEnd === format(raw).length;
              update(selected ? "" : moneyKey(raw, "backspace"));
            } else if (e.key === "Delete") {
              e.preventDefault();
              press("clear");
            } else if (e.key === "Escape") {
              if (!(autoOpen && onConfirm)) {
                e.stopPropagation();
                setOpen(false);
              }
            } else if (e.key === "Enter") {
              e.preventDefault();
              done();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text").replace(/[₹,\s]/g, "");
            if (/^\d{1,11}(\.\d{0,2})?$/.test(text)) update(text);
            else setError("Paste an amount with up to two decimal places.");
          }}
        />
        {!open && (
          <button
            type="button"
            className="money-edit"
            aria-label={"Edit " + label}
            onClick={() => setOpen(true)}
          >
            Edit
          </button>
        )}
      </div>
      {name && <input type="hidden" name={name} value={raw} />}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {open && (
        <div
          className="county-keypad"
          id={id + "-pad"}
          role="group"
          aria-label="County number pad"
        >
          <div className="keypad-heading">
            <span>MAKE IT COUNT</span>
            {!(autoOpen && onConfirm) && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close number pad"
              >
                <X size={17} />
              </button>
            )}
          </div>
          <div className="keypad-grid">
            {[
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              ".",
              "0",
              "backspace",
            ].map((key) => (
              <button
                type="button"
                key={key}
                className={
                  "keypad-key" +
                  (key === "." || key === "backspace"
                    ? " keypad-key-utility"
                    : "")
                }
                aria-label={
                  key === "backspace"
                    ? "Delete last digit"
                    : key === "."
                      ? "Decimal point"
                      : key
                }
                onClick={() => press(key)}
              >
                {key === "backspace" ? (
                  <Delete size={21} strokeWidth={1.65} />
                ) : key === "." ? (
                  <span className="keypad-decimal" aria-hidden="true" />
                ) : (
                  <span className="keypad-numeral">{key}</span>
                )}
              </button>
            ))}
          </div>
          <div className="keypad-actions">
            <button type="button" onClick={() => press("clear")}>
              Clear
            </button>
            <button type="button" className="keypad-confirm" onClick={done}>
              {confirmLabel}
              {onConfirm ? <ArrowRight size={17} /> : <Check size={17} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
