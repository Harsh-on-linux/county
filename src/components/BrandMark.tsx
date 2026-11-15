const petal = "M128 0 A128 128 0 0 0 0 128 A128 128 0 0 0 128 0Z";
export const brandStarPath =
  "M0 -1 A1 1 0 0 0 1 0 A1 1 0 0 0 0 1 A1 1 0 0 0 -1 0 A1 1 0 0 0 0 -1Z";

/** The centre stays transparent in light mode and white in dark mode. */
export function BrandCentre() {
  return (
    <path
      className="brand-centre"
      d={brandStarPath}
      transform="translate(128 128) scale(128)"
    />
  );
}

/** Shared vector geometry for the normal mark and the full-screen SVG reveal. */
export function BrandPetals() {
  return (
    <>
      {[0, 90, 180, 270].map((rotation) => (
        <path
          className="brand-petal"
          key={rotation}
          d={petal}
          transform={`rotate(${rotation} 128 128)`}
        />
      ))}
    </>
  );
}

/** Four matching petals around the centre star; no rectangular background. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`brand-mark ${className}`}
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <BrandCentre />
      <BrandPetals />
    </svg>
  );
}
