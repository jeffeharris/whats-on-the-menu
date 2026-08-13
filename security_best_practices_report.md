# Security Best-Practices Review

Date: 2026-08-13

Scope: React 19 frontend, Express 4 API, PostgreSQL persistence, Caddy/Compose
production path, authentication, invitations, public sharing, uploads, and paid
image generation.

## Executive summary

The application has strong foundations: parameterized SQL, household-scoped
queries, integration tests for tenant isolation, secure session-cookie flags,
single-use magic links, bounded image uploads, non-root containers, and atomic
AI-spend reservations. No critical issue or demonstrated cross-household data
access was found.

It should not be broadly launched yet. The highest-priority issues are an
unsafe one-click household-invitation flow, a reachable high-severity `sharp`
advisory, production email delivery that can fail while reporting success,
public endpoints that can consume a free service's database/email quotas, and
missing CSRF protection for cookie-authenticated writes. Several privacy and
hardening issues also matter because the app stores child names, eating history,
and user-uploaded images.

## Critical findings

None found.

## High-severity findings

### SEC-001: Household invitations are accepted by a state-changing GET

- Rule ID: EXPRESS-CSRF-001 / safe HTTP method semantics
- Severity: High
- Location: `server/routes/household.ts:55-132`,
  `server/routes/household.ts:164-180`, and
  `server/db/queries/household.ts:146-193`
- Evidence: The emailed button points directly to
  `/api/household/accept-invite?token=...`. A GET to that URL creates or moves a
  user, marks the invitation accepted, deletes old sessions, creates a new
  session, and redirects home. Existing users are moved to the invited
  household without an explicit confirmation screen.
- Impact: Email security scanners and link-preview agents commonly fetch links.
  A prefetch can consume the invitation without the recipient choosing to join.
  An existing user can be moved out of their current household and have all
  sessions invalidated; if that user owns the previous household, its data can
  be left without an accessible owner.
- Fix: Make the email target a read-only frontend invitation page. Display the
  inviter/household and consequences, require an explicit user confirmation,
  and accept with a CSRF-protected POST. Block owners from leaving by invitation
  until ownership is transferred or the old household is deliberately deleted.
  Add scanner-prefetch and existing-owner regression tests.
- Mitigation: Disable household invitations for the initial beta.
- False-positive notes: The problem exists even if invitation tokens are long
  and unguessable; the issue is automatic consumption by legitimate link
  fetchers and the lack of explicit account-move consent.

### SEC-002: The untrusted-image processor has current high-severity advisories

- Rule ID: EXPRESS-DEPS-001 / EXPRESS-UPLOAD-001
- Severity: High
- Location: `package.json:33`, `server/routes/uploads.ts:143-183`, and
  `server/routes/image-generation.ts:53-74`
- Evidence: `sharp` 0.33.5 processes attacker-supplied JPEG, PNG, and WebP data.
  `npm audit --omit=dev --audit-level=high` reported the inherited libvips
  advisories grouped under GHSA-f88m-g3jw-g9cj and recommends `sharp` 0.35.3.
- Impact: This is a reachable native image-decoding surface on a public upload
  route. The exact impact depends on the underlying libvips advisories and
  platform build, but untrusted image parsing makes the finding relevant rather
  than a tooling-only false positive.
- Fix: Upgrade and pin a patched `sharp` release, review the breaking changes,
  rebuild the production image, and rerun upload tests for valid JPEG/PNG/WebP,
  malformed files, oversized files, and decompression-bomb-like inputs.
- Mitigation: Disable user uploads until the patched processor is deployed.
- False-positive notes: The audit also reported `react-router` and `ip-address`.
  React Router's reported RSC-mode issue does not appear reachable in this Vite
  SPA, while `ip-address` should be updated with `express-rate-limit` and
  re-evaluated when proxy trust is fixed.

### SEC-003: Production email can fail open and authentication tokens can be logged

- Rule ID: secret handling / authentication availability
- Severity: High
- Location: `server/email.ts:3-5`, `server/routes/auth.ts:27-46`,
  `server/routes/auth.ts:91-94`, `server/routes/household.ts:168-187`, and
  `docker-compose.prod.yml:43-46`
- Evidence: `RESEND_API_KEY` is optional. When absent, magic and invitation URLs
  containing live bearer tokens are written to logs. When Resend is configured,
  the returned `{ error }` value is ignored, so API/network rejection can still
  be followed by `{ success: true }`.
- Impact: Users can be told to check email when nothing was delivered, blocking
  all login. A production misconfiguration also puts live login credentials in
  centralized/container logs.
- Fix: Validate `RESEND_API_KEY`, `APP_URL`, and the sending domain at production
  startup; fail closed if absent. Check and handle Resend's returned error. Log
  local links only in an explicit development/test mode and redact all token
  query parameters from HTTP and application logs. Exercise a real end-to-end
  delivery test before launch.
- Mitigation: Keep the beta invite-only and manually monitor delivery failures.
- False-positive notes: If the live environment already has a valid key and all
  deliveries succeed, the token-log branch is inactive, but the deployment does
  not enforce that condition and delivery errors are still ignored.

### SEC-004: Public writes permit disproportionate email and database consumption

- Rule ID: EXPRESS-BODY-001 / EXPRESS-INPUT-001 / abuse prevention
- Severity: High
- Location: `server/app.ts:38`, `server/app.ts:51-73`,
  `server/routes/auth.ts:71-94`, `server/validation/schemas.ts:7-10`,
  `server/validation/schemas.ts:169-172`, and
  `server/routes/shared-menus.ts:48-90`
- Evidence: Every JSON route accepts up to 10 MB. Signup accepts an unbounded
  household name and creates a household, user, seed foods, presets, a token,
  and email before the address is verified. The public shared-response schema
  permits unbounded names/records/arrays, and the route persists the original
  `selections` object, including extra group keys it never validates.
- Impact: A small number of unauthenticated requests can exhaust a free email
  allowance, bloat PostgreSQL, consume CPU/memory during JSON and Zod parsing,
  or fill the database through a known public share token. This directly
  threatens the goal of keeping the beta free and available.
- Fix: Use a conservative global JSON limit (for example, 64-256 KB) with smaller
  route-specific schemas; set length/count limits on every public string, array,
  object, and nested group; reject unknown response group keys; persist a newly
  constructed normalized response rather than the submitted object. Defer
  household seeding until email verification and add per-email plus daily global
  email caps. Consider invite codes or a privacy-compatible anti-bot control for
  open signup.
- Mitigation: Keep open signup and shared menus disabled for the first beta.
- False-positive notes: Current minute-based rate limits reduce request count,
  but do not bound per-request size or daily email/database consumption.

### SEC-005: Cookie-authenticated writes lack CSRF tokens

- Rule ID: EXPRESS-CSRF-001 / REACT-CSRF-001
- Severity: High
- Location: `src/api/client.ts:5-9`, `src/contexts/AuthContext.tsx:56-59`, and
  `server/app.ts:98-110`
- Evidence: The browser automatically includes the `session` cookie on writes,
  but the client sends no CSRF token and the server validates none. SameSite is
  set to `Lax` in the current working tree at `server/routes/auth.ts:55-65`,
  which is useful defense in depth but not a complete CSRF design.
- Impact: A same-site hostile origin, future subdomain takeover, or a route that
  accepts a simple cross-origin request can trigger writes under the user's
  session. The current GET invitation mutation is a concrete example of unsafe
  request semantics, though it is token-authenticated rather than session-only.
- Fix: Add a synchronizer or signed double-submit CSRF token, attach it to all
  POST/PUT/PATCH/DELETE requests, validate it centrally, and retain Strict
  SameSite cookies plus exact CORS/origin checks. Ensure every state change uses
  a non-GET method.
- Mitigation: Add strict Origin/Referer or Fetch Metadata validation while the
  token flow is implemented.
- False-positive notes: Host-only Lax cookies and exact production CORS make
  many conventional cross-site writes harder than in a `SameSite=None`
  deployment. They do not replace a deliberate write-request
  authenticity control.

## Medium-severity findings

### SEC-006: Rate limiting does not account for the trusted reverse proxy

- Rule ID: EXPRESS-PROXY-001 / EXPRESS-AUTH-001
- Severity: Medium
- Location: `server/app.ts:29-73` and `Caddyfile:20-30`
- Evidence: Production traffic comes through Caddy, but Express never configures
  `trust proxy`. IP-keyed limiters therefore see the proxy socket rather than the
  client address.
- Impact: All public users can share the same 20-auth, 300-API, and 60-share
  requests-per-minute buckets. One user can lock out everyone else. A careless
  later fix using `trust proxy = true` could instead permit spoofing.
- Fix: Configure the exact topology (likely one controlled hop), ensure Caddy
  overwrites forwarded headers, and test independent client buckets plus spoofed
  header handling.
- Mitigation: Monitor 429 rates and raise only the shared limits temporarily.
- False-positive notes: Verify the live network path; if another trusted hop is
  present, a hop count of one is not correct.

### SEC-007: The parent PIN is UI gating, not server authorization

- Rule ID: REACT-AUTHZ-001
- Severity: Medium
- Location: `src/contexts/AppStateContext.tsx:28-73`, `src/App.tsx:284-319`,
  `server/middleware/auth.ts:4-21`, and `server/routes/auth.ts:206-216`
- Evidence: Successful PIN entry changes localStorage-backed React state. It
  does not create a server-side parent-authorized session. All protected APIs
  authorize only the household session cookie.
- Impact: A child using the already signed-in family device can bypass the PIN
  with developer tools or direct API calls and modify/delete menus, profiles,
  history, uploads, or household settings. The PIN protects the visible UI only.
- Fix: Decide whether the PIN is merely a convenience or a security boundary.
  If it is a boundary, mint a short-lived server-side parent grant after PIN
  verification and require it on parent mutations. Rate-limit PIN failures and
  avoid storing the PIN in plaintext.
- Mitigation: Label the PIN honestly as a child deterrent and advise parents not
  to leave sensitive account access unattended.
- False-positive notes: This is not a remote-account takeover vulnerability; it
  matters because shared-device child use is a core product scenario.

### SEC-008: Uploaded household images are permanently public by bearer URL

- Rule ID: EXPRESS-STATIC-001 / REACT-FILE-001
- Severity: Medium
- Location: `server/app.ts:75-77` and `server/routes/uploads.ts:178-199`
- Evidence: Authenticated uploads are converted to JPEG and assigned UUID names,
  but the entire uploads directory is served without authorization. There is no
  expiry, signed URL, or cache invalidation control.
- Impact: Anyone who obtains a URL can view the image indefinitely until it is
  deleted. URLs can leak through shared menus, screenshots, logs, copied links,
  or future analytics. Family/child photos make the confidentiality impact
  significant even though guessing a UUID is impractical.
- Fix: Separate private household assets from explicitly public shared-menu
  assets. Serve private files through an ownership-checked route or short-lived
  signed URLs; require explicit consent before publishing an image into a share.
- Mitigation: Warn beta users not to upload people or sensitive household
  images and disable uploads until the privacy policy and storage design agree.
- False-positive notes: Sharp conversion and random filenames mitigate active
  content and enumeration, not bearer-URL leakage.

### SEC-009: No Content Security Policy is deployed, and live headers drift from the repo

- Rule ID: EXPRESS-HEADERS-001 / REACT-CSP-001
- Severity: Medium
- Location: `server/app.ts:29-43`, `Caddyfile:11-18`, and `index.html:1-42`
- Evidence: Neither Express, the HTML entry point, nor the checked-in Caddy
  reference sets CSP. A live header check on 2026-08-13 confirmed no CSP and
  exposed `X-Powered-By: Express`. It also showed header values not represented
  by the reference Caddyfile, indicating configuration drift.
- Impact: A future XSS has fewer browser-enforced limits, and configuration drift
  makes security posture difficult to reproduce or review.
- Fix: Add Helmet or equivalent edge headers, disable `x-powered-by`, and roll
  out a realistic CSP (report-only first, then enforce). Account for Google Fonts
  or self-host them. Make the actual Caddy configuration reproducible and test
  expected live headers after deployment.
- Mitigation: Keep React's escaping defaults and avoid raw HTML/DOM sinks; no
  dangerous sink was found in the current frontend scan.
- False-positive notes: Clickjacking and `nosniff` protections are present live;
  this finding is specifically CSP, fingerprinting, and config drift.

## Low-severity findings

### SEC-010: Signup reveals whether an email address already has an account

- Rule ID: authentication privacy
- Severity: Low
- Location: `server/routes/auth.ts:80-83`
- Evidence: Signup returns `An account with that email already exists`, while
  login deliberately avoids account enumeration.
- Impact: An attacker can test whether a person's address is registered.
- Fix: Return a generic response and, for existing users, offer to send the
  normal login link subject to abuse controls.
- Mitigation: Keep rate limiting and avoid logging enumeration attempts with
  full email addresses.
- False-positive notes: Some products accept this privacy tradeoff for usability;
  document it if retained.

### SEC-011: Session, magic-link, invitation, and parent-PIN credentials are plaintext at rest

- Rule ID: credential storage defense in depth
- Severity: Low
- Location: `server/db/queries/auth.ts:50-68`,
  `server/db/queries/auth.ts:92-110`, `server/db/queries/auth.ts:124-135`, and
  `docs/schema.sql:91-104`
- Evidence: Bearer tokens and the four-digit PIN are stored directly and queried
  by value.
- Impact: Read access to the database immediately exposes active sessions,
  unexpired links, and the PIN. A four-digit PIN is inherently low entropy, so
  hashing mainly limits accidental disclosure rather than determined offline
  guessing.
- Fix: Store hashes of random bearer tokens and compare hashes on lookup. Treat
  the parent PIN as a rate-limited local deterrent or use an appropriate slow
  password hash if it becomes an authorization boundary.
- Mitigation: Restrict database/log access and shorten/rotate sessions as needed.
- False-positive notes: Random token generation and expiration are otherwise
  sound, and magic links are atomically single-use.

## Verification summary

- `npm run lint`: passed on the baseline and again after unrelated context-loading
  changes appeared in the shared working tree. Those concurrent changes were
  not authored or modified by this review.
- TypeScript build: passed.
- Vite production build to a clean temporary output directory: passed; the
  standard output directory currently contains container-owned ignored files.
- Server integration tests: 38/38 passed against disposable PostgreSQL 16.
- Deployment trust-boundary check: passed.
- `npm audit --omit=dev --audit-level=high`: four high advisories reported;
  `sharp` is directly reachable, while `react-router` and `ip-address` require
  the reachability triage described above.
- Live HTTPS app and health endpoint: healthy on 2026-08-13; CSP absent and
  `X-Powered-By` exposed.

## Recommended remediation order

1. Disable invitations and uploads temporarily; fix SEC-001 and SEC-002.
2. Make production email fail closed and delivery-tested (SEC-003).
3. Bound public inputs, defer signup seeding, and add daily abuse budgets
   (SEC-004).
4. Add CSRF protection and correct trusted-proxy rate limiting (SEC-005/006).
5. Reconcile child-data privacy, public image handling, and the parent-PIN
   promise (SEC-007/008).
6. Deploy and continuously test the header baseline (SEC-009), then address the
   low-severity defense-in-depth items.
