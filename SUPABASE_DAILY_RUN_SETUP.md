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

## Unlimited ranked-run policy

Daily Run now permits unlimited ranked runs throughout each UTC day. For an existing deployment:

1. Run `supabase-daily-run-unlimited-attempts.sql` in the SQL Editor.
2. Deploy the updated website.

The database and function return `-1` as an internal unlimited sentinel. The client presents this as **Unlimited ranked runs**. The original configuration column is retained internally as a reversible rollout switch, but it is no longer described as a debug mode to players.

Clean installations need only the current `supabase-daily-run.sql`, which enables unlimited ranked runs by default.

## Smoke test

1. Create or reuse a device-bound player by saving initials.
2. Select **Daily Run**. The menu should show `Unlimited ranked runs`.
3. Start a run. The menu reserves ranked run 1 immediately before countdown.
4. Finish the run. The result should change from `Verifying...` to `Verified` and show the Daily rank.
5. Repeat at least three more times. Every completed run should verify and only the player's strongest result should represent them on the Daily leaderboard.
6. Confirm that each run receives an increasing ranked-run number and no Practice Run appears because of run count.

If the SQL has not been installed, the client remains in clearly labeled local-preview mode. This fallback does not submit scores.

## Initial identity policy

The first release accepts any Supabase player profile, including an anonymous device-bound profile. A future hardening milestone will require a persistent email-restorable player for ranked runs so competitive identity and history survive cleared website data.
