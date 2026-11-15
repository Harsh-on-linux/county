/** A decorative field of refracted light; all text stays on the layer above. */
export function PrismSurface({
  className = "",
  tone = "adaptive",
}: {
  className?: string;
  tone?: "adaptive" | "ink" | "ember";
}) {
  return (
    <div
      className={`prism-surface prism-${tone} ${className}`}
      aria-hidden="true"
    >
      <div className="prism-bloom" />
      <div className="prism-reeds" />
      <div className="prism-shade" />
    </div>
  );
}
