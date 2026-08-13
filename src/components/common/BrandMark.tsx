interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className = 'h-12 w-12' }: BrandMarkProps) {
  return (
    <img
      src="/brand/mark.svg"
      alt=""
      aria-hidden="true"
      width="64"
      height="64"
      draggable={false}
      className={className}
    />
  );
}
