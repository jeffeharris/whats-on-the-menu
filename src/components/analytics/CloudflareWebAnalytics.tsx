import { useEffect } from 'react';

const SITE_TOKEN = import.meta.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim();

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
