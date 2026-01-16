/**
 * Generate a Pollinations.ai image URL for a food item
 * @param foodName - The name of the food item
 * @returns URL string for the AI-generated image
 */
export function generateFoodImageUrl(foodName: string): string {
  const prompt = `A friendly cartoon illustration of ${foodName}, simple, colorful, appetizing, white background, for children`;
  const encodedPrompt = encodeURIComponent(prompt);
  const apiKey = import.meta.env.VITE_POLLINATIONS_API_KEY;
  const keyParam = apiKey ? `&key=${apiKey}` : '';
  return `https://gen.pollinations.ai/image/${encodedPrompt}?width=400&height=400&model=flux${keyParam}`;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get placeholder image URL for food items without images
 */
export function getPlaceholderImageUrl(): string {
  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect fill="#f3f4f6" width="400" height="400"/>
      <text x="200" y="200" font-family="system-ui" font-size="48" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">?</text>
    </svg>
  `);
}
