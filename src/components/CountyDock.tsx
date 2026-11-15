import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, ChevronUp, Plus, X } from "lucide-react";
import { App as CapacitorApp } from "@capacitor/app";
import { isAndroid } from "../storage";
import { BurstMark } from "./BurstMark";
const sections = [
  { id: "Home", label: "Overview", hint: "Your everyday money" },
  { id: "Activity", label: "The ledger", hint: "Every in. Every out." },
  {
    id: "Unlabelled",
    label: "Unlabelled",
    hint: "Captured payments to review",
  },
  { id: "Household", label: "Our home", hint: "A space for your people" },
  { id: "Insights", label: "Patterns", hint: "See the bigger picture" },
];
export function CountyDock({
  tab,
  onSelect,
  onAdd,
  unlabelledCount = 0,
  blocked = false,
}: {
  tab: string;
  onSelect: (v: string) => void;
  onAdd: () => void;
  unlabelledCount?: number;
  blocked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = sections.find((s) => s.id === tab)!;
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab") {
        const items = [
          ...root.current!.querySelectorAll<HTMLButtonElement>(
            ".dock-destinations button,.dock-controls button",
          ),
        ];
        if (e.shiftKey && document.activeElement === items[0]) {
          e.preventDefault();
          items[items.length - 1]?.focus();
        } else if (
          !e.shiftKey &&
          document.activeElement === items[items.length - 1]
        ) {
          e.preventDefault();
          items[0]?.focus();
        }
      }
    };
    const focusTimer = setTimeout(
      () =>
        root.current
          ?.querySelector<HTMLButtonElement>(".dock-destinations button")
          ?.focus(),
      0,
    );
    document.addEventListener("keydown", key);
    const listener = isAndroid
      ? CapacitorApp.addListener("backButton", () => setOpen(false))
      : null;
    return () => {
      document.removeEventListener("keydown", key);
      clearTimeout(focusTimer);
      root.current
        ?.querySelector<HTMLButtonElement>(".dock-switch")
        ?.focus({ preventScroll: true });
      void listener?.then((l) => l.remove());
    };
  }, [open]);
  return (
    <div
      className={"county-dock " + (open ? "expanded" : "")}
      ref={root}
      inert={blocked}
      aria-hidden={blocked || undefined}
    >
      {open && (
        <>
          <button
            className="dock-scrim"
            aria-label="Dismiss spaces menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <nav className="dock-destinations" aria-label="County spaces">
            <div className="dock-menu-caption">
              <span>FIND YOUR SPACE</span>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
              >
                <X size={15} />
              </button>
            </div>
            {sections.map((s, i) => (
              <button
                key={s.id}
                aria-label={s.id}
                aria-current={tab === s.id ? "page" : undefined}
                onClick={() => {
                  onSelect(s.id);
                  setOpen(false);
                }}
              >
                <span className="dock-index">0{i + 1}</span>
                <span>
                  <strong>
                    {s.label}
                    {s.id === "Unlabelled" && unlabelledCount > 0 && (
                      <span className="dock-inbox-count">
                        {unlabelledCount}
                      </span>
                    )}
                  </strong>
                  <small>{s.hint}</small>
                </span>
                {s.id === tab ? (
                  <Check size={17} />
                ) : (
                  <ArrowUpRight size={17} />
                )}
              </button>
            ))}
          </nav>
        </>
      )}
      <div className="dock-controls">
        <button
          className="dock-switch"
          aria-label="Navigate County"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <BurstMark className="dock-active-symbol" />
          <span>{current.label}</span>
          <small>0{sections.indexOf(current) + 1}</small>
          {open ? <X size={16} /> : <ChevronUp size={16} />}
        </button>
        <button
          className="dock-record"
          aria-label="Add transaction"
          onClick={() => {
            setOpen(false);
            onAdd();
          }}
        >
          <Plus size={17} strokeWidth={1.6} />
          <span>Record</span>
          <ArrowUpRight size={16} />
        </button>
      </div>
    </div>
  );
}
