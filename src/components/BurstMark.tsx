/** Eight rounded rays reconstructed from the supplied reference as vector paths. */
export function BurstMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`burst-mark ${className}`}
      viewBox="-64 -64 128 128"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <path
          key={i}
          d="M0 0 L-10 -44 A11 11 0 1 1 10 -44 Z"
          transform={`rotate(${i * 45})`}
        />
      ))}
    </svg>
  );
}
