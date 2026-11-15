import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { BurstMark } from "./BurstMark";
export function ChoiceField({
  label,
  name,
  options,
  defaultValue = "",
  value,
  onChange,
  placeholder = "Choose one",
}: {
  label: string;
  name?: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(defaultValue),
    [open, setOpen] = useState(false),
    id = useId(),
    root = useRef<HTMLDivElement>(null);
  const selected = value ?? local;
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  function select(v: string) {
    onChange ? onChange(v) : setLocal(v);
    setOpen(false);
    root.current?.querySelector<HTMLButtonElement>("[role=combobox]")?.focus();
  }
  return (
    <div className="choice-field" ref={root}>
      <span id={id + "-label"} className="choice-label">
        {label}
      </span>
      <button
        type="button"
        role="combobox"
        aria-labelledby={id + "-label"}
        aria-controls={id}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="choice-trigger"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            setOpen(false);
          } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setTimeout(
              () =>
                root.current
                  ?.querySelector<HTMLElement>(
                    "[aria-selected=true], [role=option]",
                  )
                  ?.focus(),
              0,
            );
          }
        }}
      >
        <span>
          {options.find((o) => o.value === selected)?.label || placeholder}
        </span>
        <ChevronDown size={16} />
      </button>
      {name && <input type="hidden" name={name} value={selected} />}
      {open && (
        <div
          id={id}
          role="listbox"
          aria-label={label}
          className="choice-options"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setOpen(false);
              root.current
                ?.querySelector<HTMLButtonElement>("[role=combobox]")
                ?.focus();
            }
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
              e.preventDefault();
              const items = [
                ...root.current!.querySelectorAll<HTMLButtonElement>(
                  "[role=option]",
                ),
              ];
              const i = items.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              items[
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? items.length - 1
                    : (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
                      items.length
              ]?.focus();
            }
          }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === selected}
              onClick={() => select(o.value)}
            >
              <BurstMark className="choice-symbol" />
              <span>{o.label}</span>
              {o.value === selected && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
