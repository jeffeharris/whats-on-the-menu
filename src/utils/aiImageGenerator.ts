/**
 * Generate AI image using Pollinations.ai
 * No API key required - images are generated on-demand at the URL
 */
export function generateAIImageUrl(description: string): string {
  const encoded = encodeURIComponent(description);
  // Pollinations.ai generates images at this URL pattern
  return `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true`;
}
