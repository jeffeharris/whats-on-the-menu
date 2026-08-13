import { useEffect } from 'react';

const rawAnalyticsValue = import.meta.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim();

function getSiteToken(value: string | undefined) {
  if (!value) return undefined;

  // Cloudflare presents the token inside a ready-to-paste script tag. Accept
  // that snippet as well as a bare token so either can be stored in GitHub.
  const embeddedToken = value.match(
    /["']token["']\s*:\s*["']([^"']+)["']/i,
  )?.[1];
  if (embeddedToken) return embeddedToken.trim();

  // Never pass an unparsed HTML snippet to the beacon as its token.
  if (/<script\b|data-cf-beacon/i.test(value)) return undefined;

  return value;
}

const SITE_TOKEN = getSiteToken(rawAnalyticsValue);

/**
 * Loads Cloudflare's cookie-free performance beacon for the public landing page.
 *
 * SPA measurement is deliberately disabled. The landing page can navigate into
 * authenticated, kid, invitation, and token-bearing routes without those later
 * URLs becoming analytics page views.
 */
export function CloudflareWebAnalytics() {
  useEffect(() => {
    if (!import.meta.env.PROD || !SITE_TOKEN) return;
    if (document.querySelector('script[data-cf-beacon]')) return;

    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.dataset.cfBeacon = JSON.stringify({
      token: SITE_TOKEN,
      spa: false,
    });

    document.body.appendChild(script);

    // Do not remove an executed beacon when this page unmounts. Cloudflare may
    // still be waiting to report the landing page's Core Web Vitals when the
    // document becomes hidden. `spa: false` prevents subsequent routes from
    // being measured.
  }, []);

  return null;
}
