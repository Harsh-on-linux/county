/** County's etched flow lines: one vector motif across cards and statement covers. */
export function ContourLines({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`contour-lines ${className}`}
      viewBox="0 0 480 320"
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <path
          key={i}
          d={`M520 ${14 + i * 20} H${306 + i * 12} l-72 72 v68 l-78 78 H-30`}
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
