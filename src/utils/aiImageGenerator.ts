/**
 * Generate AI image using Pollinations.ai
 * Uses API key when available for better rate limits
 */
export function generateAIImageUrl(description: string): string {
  const encoded = encodeURIComponent(description);
  const apiKey = import.meta.env.VITE_POLLINATIONS_API_KEY;
  const keyParam = apiKey ? `&key=${apiKey}` : '';
  return `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true${keyParam}`;
}
