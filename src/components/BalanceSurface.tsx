import { useEffect, useRef, useState } from "react";
import { BurstMark } from "./BurstMark";
import { ContourLines } from "./ContourLines";

/** Decorative motion never changes the amount or the card's layout. */
export function BalanceSurface({ active }: { active: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    const update = () =>
      setRunning(
        active &&
          inView &&
          !motion.matches &&
          document.visibilityState === "visible",
      );
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    observer.observe(root.current!);
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [active]);
  return (
    <div
      className="balance-flow"
      ref={root}
      data-running={running}
      aria-hidden="true"
    >
      <div className="balance-flow-wash" />
      <div className="balance-flow-ribbon" />
      <div className="balance-flow-glow" />
      <BurstMark className="balance-flow-emblem" />
      <ContourLines className="balance-contours" />
    </div>
  );
}
