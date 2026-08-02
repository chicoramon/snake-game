# Private Source and Contabo Deployment Plan

## Objective

Move the public game from GitHub Pages to a custom domain hosted on Contabo,
then make the complete source repository private. Keep source control and the
public production server separated so a web-server compromise does not also
expose Git history, tests, SQL, roadmaps, or development assets.

This plan assumes a Contabo VPS running a supported Ubuntu LTS release with
Nginx. Exact commands and paths must be adjusted if the account instead uses
cPanel, Plesk, Apache, or shared hosting.

## Target Architecture

```text
Developer workstation
  ├─ complete working tree
  └─ SSH deployment key
          │
          ├── push source/history ──> Private GitHub repository
          │
          └── upload dist only ─────> Contabo release directory
                                           │
Custom domain ── DNS + HTTPS ──> Nginx ──> current release

Supabase remains authoritative for identity, leaderboards, Daily Run, and Vs.
Google Cloud remains responsible for the autonomous announcer generator.
```

The Contabo public web root must never contain `.git`, source modules, tests,
SQL migrations, documentation, uncompressed development assets, environment
files, cloud credentials, or deployment keys.

## Success Criteria

- The custom HTTPS domain loads the current production game on desktop and mobile.
- Classic, Sprint, Daily Run, player restoration, leaderboards, and Live Vs work from the new origin.
- PWA installation and offline recovery work without pinning an outdated build.
- A release can be deployed and rolled back with one authenticated command.
- Contabo contains only production artifacts and a limited number of prior releases.
- The complete GitHub source repository is private after cutover.
- No privileged credential is present in the browser bundle, server web root, or Git history.
- The previous GitHub Pages URL is either intentionally retired or replaced by a clean redirect-only site.

## Information to Confirm Before Implementation

Record these values in a private password manager, not in this repository:

- Final public game name and domain.
- Contabo server hostname or IP address.
- VPS operating system and version.
- Whether Nginx, Apache, cPanel, or Plesk manages the website.
- Non-root SSH deployment username.
- Production path and optional staging path.
- DNS provider and account owner.
- Whether the old GitHub Pages URL should disappear or redirect.
- Whether deployments run locally or through a private CI workflow.

Recommended names used as placeholders below:

```text
Production:  https://game.example.com
Staging:     https://staging.game.example.com
Releases:    /var/www/neon-fang/releases
Active link: /var/www/neon-fang/current
```

## Phase 1 — Preserve and Audit the Current System

1. Create an encrypted backup of the entire working directory outside Contabo.
2. Verify the existing `backup/gh-pages-pre-vite` branch and create a dated source tag.
3. Export or document the current GitHub Pages DNS and repository settings.
4. Record the currently deployed commit hash and keep a copy of its `dist/` output.
5. Run the complete verification baseline:

   ```powershell
   npm ci
   npm test
   npm run test:smoke
   npm run build
   ```

6. Audit tracked files and Git history for credentials. Search for Supabase
   service-role keys, SMTP passwords, Google credentials, private SSH keys,
   access tokens, and `.env` files without printing their values into logs.
7. Rotate any privileged secret that has ever been committed. Deleting it from
   the latest commit is not sufficient.
8. Confirm that browser code contains only publishable configuration such as a
   Supabase project URL and anon key; authorization must remain enforced by RLS,
   RPCs, and Edge Functions.

Exit condition: the current production build is reproducible, backed up, and
contains no known privileged secret.

## Phase 2 — Prepare Private Source Control

Private GitHub repositories are available without moving the source to the VPS.
Do not make the current repository private until the Contabo site is verified,
because GitHub Pages may be unpublished immediately under the current plan.

1. Ensure the GitHub account uses a passkey or two-factor authentication.
2. Store recovery codes offline.
3. Review collaborators, deploy keys, personal access tokens, and Actions secrets.
4. Decide whether to:

   - Make `chicoramon/snake-game` private after cutover; or
   - Create `chicoramon/snake-game-source` as the private source repository,
     verify its history, and later retire the original public repository.

5. Enable Dependabot alerts and the private-repository security features
   available on the selected GitHub plan.
6. Protect `main` from accidental deletion and force-pushes where the plan allows.
7. Maintain an encrypted off-site mirror or bundle so GitHub is not the only backup.

Exit condition: there is a verified private destination for the complete source
before any public repository is removed, renamed, or rewritten.

## Phase 3 — Harden the Contabo VPS

Perform this phase before placing application files on the server.

1. Update the operating system and enable unattended security updates.
2. Create a dedicated, non-root deployment account.
3. Use SSH public-key authentication; disable password authentication after
   verifying key access in a second terminal.
4. Disable direct root SSH login.
5. Restrict the firewall to required ports:

   - `22/tcp` for SSH, preferably restricted to trusted source addresses.
   - `80/tcp` temporarily for HTTP and certificate issuance/redirects.
   - `443/tcp` for the production game.

6. Install and configure Nginx, or use the hosting panel's supported equivalent.
7. Enable login throttling or Fail2ban where appropriate.
8. Configure server monitoring for disk usage, certificate expiry, uptime, and
   repeated authentication failures.
9. Configure automated Contabo snapshots or backups, plus an independent
   off-site backup. A provider snapshot alone is not sufficient.

Recommended ownership model:

```text
/var/www/neon-fang/
  releases/                 deploy user writes here
    2026-08-03T120000Z/
    2026-08-04T093000Z/
  current -> releases/...   atomically switched symlink
```

Nginx should read the active release but must not run as the deployment user.
No repository checkout should exist beneath `/var/www`.

Exit condition: the empty HTTPS-capable host is patched, key-only, least-
privileged, backed up, and ready to serve static files.

## Phase 4 — Configure Staging, Domain, and HTTPS

1. Create a staging hostname first, such as `staging.game.example.com`.
2. Add its DNS `A` record and an `AAAA` record only if IPv6 is configured correctly.
3. Obtain a trusted TLS certificate using Certbot or the hosting panel.
4. Redirect HTTP to HTTPS.
5. Configure Nginx to serve `current/` and fall back to `index.html` only for
   genuine browser navigation routes.
6. Disable directory listing and access to dotfiles.
7. Apply caching deliberately:

   - `index.html`, `sw.js`, and `manifest.webmanifest`: revalidate/no-cache.
   - Hashed files under `assets/`: long-lived immutable caching.
   - Source maps: do not deploy.

8. Add safe headers including `X-Content-Type-Options: nosniff`, an appropriate
   `Referrer-Policy`, and a restrictive `Permissions-Policy`.
9. Introduce Content Security Policy in report-only mode first. The game uses
   Supabase and other explicit external resources, so blocking policy must be
   validated before enforcement.
10. Enable HSTS only after HTTPS works correctly on every intended hostname.

Exit condition: the staging origin serves a placeholder securely and passes a
basic TLS and header review.

## Phase 5 — Adapt the Game to the New Origin

The Vite configuration already uses `base: './'`, so hashed assets should work
at either a domain root or subdirectory. The generated service worker also uses
relative paths. Verify rather than assume the following:

1. Build and serve the actual `dist/` directory on staging.
2. Confirm `index.html`, the manifest, icons, audio, theme assets, and `sw.js`
   load without GitHub's `/snake-game/` prefix.
3. Confirm service-worker registration scope is the intended domain root.
4. Verify navigation is network-first and a second deployment replaces the
   previous shell without requiring users to clear Safari data.
5. Update public metadata:

   - Canonical URL.
   - Open Graph URL and image.
   - PWA `start_url` and `scope` if necessary.
   - Share text and any hard-coded GitHub Pages links.
   - Live Vs invitation URLs.

6. Update Supabase configuration:

   - Authentication Site URL.
   - Allowed redirect URLs for production and staging.
   - Any Edge Function origin allowlist or CORS logic.
   - Email templates containing an absolute site URL.

7. Retain the GitHub Pages origin temporarily in allowed redirects only during
   the migration window, then remove it after retirement.
8. Confirm Google Cloud services do not assume the old browser origin.

Exit condition: staging runs exclusively from the custom-domain environment
with no unexpected requests to `chicoramon.github.io`.

## Phase 6 — Create an Atomic Contabo Deployment Command

Add a future `deploy-contabo.ps1` script only after the server details are
confirmed. It should perform these operations in order:

1. Validate required tools and SSH connectivity.
2. Run unit tests.
3. Run browser smoke tests unless explicitly performing an emergency rollback.
4. Run `npm run build`.
5. Verify that `dist/index.html` and `dist/sw.js` exist.
6. Reject `.map`, `.env`, `.git`, source, test, SQL, and documentation files.
7. Create a timestamped local archive and checksum manifest.
8. Upload into a new remote release directory, never directly into `current`.
9. Verify remote checksums and required files.
10. Atomically update the `current` symlink.
11. Request the production URL with cache bypass and verify an expected build marker.
12. Keep a small fixed number of prior releases and remove older ones safely.
13. Print the deployed release identifier and exact rollback command.

The script must use an SSH key or agent. It must never embed a server password,
private key, Supabase service-role key, or cloud credential.

Rollback should only switch `current` to the immediately preceding verified
release and reload Nginx only when its configuration changed. A static game
rollback should not rebuild or overwrite files in place.

Exit condition: staging deployment and rollback both succeed from a single
local command without transferring source code.

## Phase 7 — Full Staging Test Matrix

Run automated tests and then complete real-device testing:

- Fresh load with no service worker or local storage.
- Upgrade from the prior cached build.
- Offline launch after one successful online load.
- Safari on a physical iPhone, including background/foreground recovery.
- Chrome or Edge on Android and desktop.
- Classic, Sprint, and Daily Run completion.
- Ranked Daily reservation, verification, submission, and leaderboard display.
- New guest initials and optional display name.
- Email save, restore, and preference synchronization.
- Random theme selection across consecutive games.
- D-PAD, TURN, TAP, and keyboard behavior.
- Player options, onboarding, What's New, and Career Stats.
- Live Vs room creation, invitation link, joining, stage selection, rematch,
  spectator flow, disconnect handling, and room departure on two networks.
- Background and in-game audio preferences.
- High-speed effect preference and sonic-boom behavior.
- Custom domain share links and social preview metadata.
- Supabase outage and offline fallbacks.
- No console errors, mixed content, missing assets, or old-domain requests.

Exit condition: automated suites pass and the physical-device checklist is
signed off against the staging release intended for production.

## Phase 8 — Production DNS Cutover

1. Lower the intended DNS record TTL at least one normal TTL period in advance.
2. Deploy the exact staging-tested build to the production release path.
3. Obtain and verify the production TLS certificate.
4. Update production DNS to the Contabo address.
5. Monitor both old and new origins during propagation.
6. Verify HTTPS, service-worker behavior, Supabase authentication, Daily Run,
   Live Vs, and share links from external networks.
7. Keep the old GitHub Pages build untouched during the observation window.
8. Restore a normal DNS TTL after the cutover is stable.

DNS rollback: restore the prior record while it remains available. Application
rollback: switch the Contabo `current` symlink to the prior release. Database
changes must retain their own backward-compatible rollback plan and must not be
coupled casually to a static deployment.

Exit condition: the custom domain has served the verified release reliably for
the agreed observation period.

## Phase 9 — Privatize GitHub and Retire Pages

Only begin after production on Contabo is confirmed.

1. Verify the private source backup or destination one final time.
2. In GitHub, open **Settings → General → Danger Zone → Change repository
   visibility** and make the source repository private.
3. Confirm GitHub Pages is unpublished and the source is inaccessible while
   signed out.
4. Remove GitHub Pages deployment permissions, unused Actions workflows,
   obsolete deploy keys, and obsolete personal access tokens.
5. Remove the GitHub Pages URL from Supabase redirects and origin allowlists
   after the transition period.
6. Update internal deployment documentation to name Contabo as production.

Making the repository private does not revoke forks or copies made while it was
public. The proprietary `LICENSE` records the intended rights, while Git history
and dated backups preserve evidence of development.

### Optional Old-URL Redirect

If preserving the old player link matters, do not leave the source repository
public merely for a redirect. Instead, create a new public repository with a
fresh, unrelated history containing only a minimal redirect page to the custom
domain. Confirm the exact repository rename/replacement sequence before acting,
because repository visibility and deletion are consequential operations.

## Phase 10 — Ongoing Operations

- Patch the VPS and review failed SSH logins regularly.
- Test certificate renewal before expiry.
- Monitor uptime, disk space, HTTP errors, and Supabase/Edge Function failures.
- Retain release checksums and deployment logs without secrets.
- Test an application rollback quarterly.
- Test restoring the private source backup and Contabo configuration backup.
- Review GitHub collaborators, deploy keys, tokens, and cloud service accounts.
- Rotate deployment credentials after personnel or device changes.
- Keep production and staging Supabase redirect/origin lists minimal.
- Never debug by placing source, database exports, or credentials in the web root.

## Planned Repository Changes

These changes should be implemented only when the corresponding phase begins:

- Add `deploy-contabo.ps1` with dry-run, production, and rollback modes.
- Replace GitHub Pages-specific text in `DEPLOYMENT.md` with Contabo operations.
- Add a non-secret example deployment configuration file.
- Add deployment artifact validation tests.
- Add a build identifier endpoint or static file for post-deploy health checks.
- Add Nginx configuration templates without domain credentials or private keys.
- Mark completed phases in `FUTURE-ROADMAP.md` as they are deployed and verified.

## Final Go/No-Go Checklist

Do not privatize the source repository or retire GitHub Pages until every item is true:

- [ ] Current source and deployment artifacts are backed up.
- [ ] No known privileged secret exists in the client or Git history.
- [ ] Private source control is verified.
- [ ] Contabo is patched, key-only, firewalled, monitored, and backed up.
- [ ] Staging and production HTTPS are valid.
- [ ] Atomic deployment and rollback are proven.
- [ ] Automated tests pass on the exact production artifact.
- [ ] Physical iPhone and second-device Live Vs testing pass.
- [ ] Supabase authentication and origin settings include the custom domain.
- [ ] Service-worker upgrade behavior is verified from an older release.
- [ ] Production DNS has stabilized.
- [ ] The old URL retirement or redirect decision is implemented.
- [ ] GitHub visibility is changed only after the new production site is healthy.
