/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get placeholder image URL for food items without images.
 * Warm cream background with utensils icon in soft amber.
 */
export function getPlaceholderImageUrl(): string {
  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#FDF6EC" width="400" height="400"/>
      <g transform="translate(125, 110)" fill="none" stroke="#D4A574" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
        <path d="M60 10 L60 170"/>
        <path d="M40 10 C40 10, 40 70, 60 70 C80 70, 80 10, 80 10"/>
        <path d="M120 10 L120 80 C120 100, 100 100, 100 100 L100 170"/>
        <path d="M120 10 L120 30"/>
        <path d="M140 10 L140 30"/>
        <path d="M120 30 C120 55, 140 55, 140 30"/>
      </g>
    </svg>
  `);
}
