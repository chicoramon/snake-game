# Supabase Daily Run Setup

Daily Run ranking uses GitHub Pages for the game client and Supabase for authoritative UTC challenges, attempt reservations, replay verification, and rankings.

## Prerequisites

- `supabase-player-identity-auto-submit.sql` has already been applied.
- Anonymous sign-ins are enabled because the initial Daily Run launch permits device-bound players.
- The Supabase CLI is linked to the project.

## Install

Deploy the replay validator first so ranked submissions are available before the database begins issuing attempts:

```powershell
npx supabase init
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy submit-daily-attempt
```

The function uses Supabase's automatically provided project URL and publishable/secret keys, with compatibility for projects still exposing the legacy anon/service-role key names.

Then open the Supabase SQL Editor and run the complete contents of:

```text
supabase-daily-run.sql
```

Finally, deploy the updated website normally.

## Daily archive and legends upgrade

For a project where the original Daily Run SQL is already deployed, open the SQL Editor and run:

```text
supabase-daily-leaderboard-archive.sql
```

This adds two read-only public views:

- `daily_leaderboard_days` supplies past-day navigation, challenge metadata, participation totals, and each day's winner.
- `daily_player_stats` supplies lifetime wins, podiums, top-ten finishes, win rate, longest/current participation streaks, and longest/current winning streaks. It intentionally excludes the still-open current UTC challenge, so Daily Legends appears only after at least one completed day has ranked results.

No Edge Function redeployment is required for this upgrade. The complete `supabase-daily-run.sql` also includes these views for clean future installations.

## Browser-only install

If the Supabase CLI cannot reach the Management API, the same setup can be completed in the Supabase Dashboard:

1. Open **Edge Functions**, choose **Deploy a new function** and then **Via Editor**.
2. Name the function exactly `submit-daily-attempt`.
3. Replace the editor contents with the complete contents of:

   ```text
   supabase/dashboard/submit-daily-attempt-index.ts
   ```

4. Keep JWT verification enabled and click **Deploy function**.
5. Open the **SQL Editor** and run the complete contents of `supabase-daily-run.sql`.

The dashboard entrypoint contains the same replay validator as the two-file CLI source, inlined because the browser editor deploys a single entrypoint. Supabase provides the project URL and project keys to the function environment automatically; do not paste keys into the source.

## Temporary unlimited-attempt debug mode

During end-to-end debugging, ranked attempts can be made explicitly unlimited without changing the production default:

1. Rerun the complete current `supabase-daily-run.sql` in the SQL Editor to install the config switch and updated RPCs.
2. Run `supabase-daily-run-debug-mode.sql` to enable the switch.
3. Redeploy `submit-daily-attempt` from the current `supabase/dashboard/submit-daily-attempt-index.ts`.

The database and function return `-1` as an internal unlimited sentinel; the client renders this as **DEBUG • Unlimited ranked attempts**. Before launch, execute the disable statement included at the bottom of `supabase-daily-run-debug-mode.sql`. Production then returns to three attempts without another code deployment.

## Smoke test

1. Create or reuse a device-bound player by saving initials.
2. Select **Daily Run**. The menu should show `3/3 ranked attempts left`.
3. Start a run. The menu reserves attempt 1 immediately before countdown.
4. Finish the run. The result should change from `Verifying...` to `Verified` and show the Daily rank.
5. Repeat twice. The counter should reach `0/3`.
6. Start again. The run should be labeled **Practice Run** and should not submit.
7. Clear neither site data nor the Supabase session during this test; the initial policy intentionally ties the allowance to the current anonymous Auth user.

If the SQL has not been installed, the client remains in clearly labeled local-preview mode. This fallback does not submit scores.

## Initial identity policy

The first release accepts any Supabase player profile, including an anonymous device-bound profile. A future hardening milestone will require a persistent email-restorable player for ranked attempts so clearing website data cannot create a fresh allowance.
