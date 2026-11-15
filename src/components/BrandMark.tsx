const petal = "M128 0 A128 128 0 0 0 0 128 A128 128 0 0 0 128 0Z";

/** Shared vector geometry for the normal mark and the full-screen SVG reveal. */
export function BrandPetals() {
  return (
    <>
      {[0, 90, 180, 270].map((rotation) => (
        <path
          key={rotation}
          d={petal}
          transform={`rotate(${rotation} 128 128)`}
        />
      ))}
    </>
  );
}

/** Four circular petals with an open centre and a transparent background. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`brand-mark ${className}`}
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <BrandPetals />
    </svg>
  );
}
