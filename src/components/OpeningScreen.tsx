import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { createTimeline, utils, type Timeline } from "animejs";
import { ArrowRight } from "lucide-react";
import { BrandMark, BrandPetals } from "./BrandMark";

// The concave opening between the logo's four circular petals, centred at 0,0.
const star =
  "M0 -1 A1 1 0 0 0 1 0 A1 1 0 0 0 0 1 A1 1 0 0 0 -1 0 A1 1 0 0 0 0 -1Z";

function buildOpening(
  root: HTMLDivElement,
  complete: () => void,
  reduced: boolean,
) {
  const flight = root.querySelector<HTMLElement>(".intro-flight")!;
  const caption = root.querySelector<HTMLElement>(".intro-wordmark")!;
  const hole = root.querySelector<SVGPathElement>(".intro-aperture")!;
  const portalMark = root.querySelector<SVGGElement>(".intro-portal-mark")!;
  const portalOrigin = root.querySelector<SVGGElement>(".intro-portal-origin")!;
  const skip = root.querySelector<HTMLElement>(".intro-skip");
  const markRadius = flight.clientWidth / 2;
  const portal = { scale: 1 };
  portalOrigin.setAttribute(
    "transform",
    `translate(${-markRadius} ${-markRadius}) scale(${markRadius / 128})`,
  );
  portalMark.style.visibility = "hidden";
  flight.style.visibility = "visible";
  // Both the mark and its opening use one value: their edges stay aligned.
  const renderPortal = () => {
    hole.setAttribute(
      "transform",
      `translate(${root.clientWidth / 2} ${root.clientHeight * 0.48}) scale(${markRadius * portal.scale})`,
    );
    portalMark.setAttribute(
      "transform",
      `translate(${root.clientWidth / 2} ${root.clientHeight * 0.48}) scale(${portal.scale})`,
    );
  };
  renderPortal();
  utils.set(flight, {
    y: reduced ? 0 : root.clientHeight * 0.52 + markRadius + 24,
  });
  utils.set(caption, { opacity: 0, y: 6 });
  utils.set(hole, { opacity: 0 });
  const timeline = createTimeline({ autoplay: false, onComplete: complete });
  if (reduced) {
    root.dataset.phase = "reduced";
    timeline.add(root, { opacity: [1, 0], duration: 160, ease: "linear" }, 30);
    return timeline;
  }
  // A unit concave star contains a circle of radius sqrt(2)-1.
  const coverScale =
    (Math.hypot(root.clientWidth / 2, root.clientHeight * 0.52) /
      (Math.SQRT2 - 1) +
      8) /
    markRadius;
  timeline
    .call(() => {
      root.dataset.phase = "rise";
    }, 80)
    .add(
      flight,
      { y: 0, duration: 760, ease: "cubicBezier(0.16, 1, 0.3, 1)" },
      80,
    )
    .add(
      caption,
      { opacity: [0, 1], y: [6, 0], duration: 300, ease: "out(3)" },
      560,
    )
    .call(() => {
      root.dataset.phase = "settle";
    }, 860)
    .call(() => {
      root.dataset.phase = "reveal";
      // Swap identical marks before zooming. SVG transforms keep the enlarged
      // artwork vector-sharp instead of magnifying a composited HTML texture.
      portalMark.style.visibility = "visible";
      flight.style.visibility = "hidden";
    }, 1120)
    .add(caption, { opacity: 0, duration: 160, ease: "in(2)" }, 1120)
    .add(hole, { opacity: [0, 1], duration: 100, ease: "inOut(2)" }, 1120)
    .add(
      portal,
      {
        scale: [1, coverScale],
        duration: 760,
        ease: "in(3)",
        onRender: renderPortal,
      },
      1220,
    );
  if (skip) timeline.add(skip, { opacity: 0, duration: 160 }, 1120);
  return timeline;
}

export function OpeningScreen({
  onDone,
  waiting = false,
}: {
  onDone?: () => void;
  waiting?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null),
    done = useRef(onDone),
    timeline = useRef<Timeline | null>(null),
    finish = useRef<() => void>(() => {});
  const maskId = "opening-" + useId().replace(/[^a-z0-9]/gi, "");
  done.current = onDone;
  useLayoutEffect(() => {
    const element = root.current!;
    let completed = false;
    const complete = () => {
      if (completed) return;
      completed = true;
      timeline.current?.pause();
      done.current?.();
    };
    finish.current = complete;
    if (waiting) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const restart = () => {
      timeline.current?.revert();
      try {
        timeline.current = buildOpening(element, complete, motion.matches);
        timeline.current.play();
      } catch (error) {
        console.error("County opening could not play", error);
        complete();
      }
    };
    restart();
    motion.addEventListener("change", restart);
    return () => {
      completed = true;
      motion.removeEventListener("change", restart);
      timeline.current?.revert();
      timeline.current = null;
    };
  }, [waiting]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !waiting) {
        event.preventDefault();
        event.stopPropagation();
        finish.current();
      } else if (event.key === "Tab") {
        event.preventDefault();
        root.current?.querySelector<HTMLButtonElement>(".intro-skip")?.focus();
      }
    };
    document.addEventListener("keydown", key, true);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", key, true);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [waiting]);
  return (
    <div
      className={
        "county-opening opening-screen " + (waiting ? "opening-waiting" : "")
      }
      ref={root}
      data-motion="animejs"
      data-phase={waiting ? "waiting" : "ready"}
      role="status"
      aria-label="Opening County"
    >
      <svg
        className="intro-curtain"
        width="100%"
        height="100%"
        aria-hidden="true"
      >
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="100%"
            height="100%"
            style={{ maskType: "luminance" }}
          >
            <rect width="100%" height="100%" fill="white" />
            <path
              className="intro-aperture"
              d={star}
              fill="black"
              opacity="0"
            />
          </mask>
        </defs>
        <rect
          className="intro-curtain-fill"
          width="100%"
          height="100%"
          mask={`url(#${maskId})`}
        />
        <g className="intro-portal-mark">
          <g className="intro-portal-origin">
            <BrandPetals />
          </g>
        </g>
      </svg>
      <div className="intro-stage" aria-hidden="true">
        <div className="intro-flight">
          <div className="intro-coin">
            <div className="intro-face intro-front">
              <BrandMark />
            </div>
          </div>
        </div>
      </div>
      <div className="intro-wordmark" aria-hidden="true">
        county<span>.</span>
      </div>
      {!waiting && (
        <button
          type="button"
          className="intro-skip"
          onClick={() => finish.current()}
        >
          Skip intro <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
