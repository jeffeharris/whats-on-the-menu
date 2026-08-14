interface RingDotIconProps {
  size?: number;
  /** Radius of the filled center dot, 0 (empty) to 9 (fills the ring). */
  dotRadius: number;
  strokeWidth?: number;
  className?: string;
}

/** Ring-and-dot icon: an outlined circle with a filled center dot, used across
 * completion controls to show how "full" a status is at a glance. */
export function RingDotIcon({ size = 16, dotRadius, strokeWidth = 1.75, className }: RingDotIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
      <circle cx="12" cy="12" r={dotRadius} fill="currentColor" />
    </svg>
  );
}
