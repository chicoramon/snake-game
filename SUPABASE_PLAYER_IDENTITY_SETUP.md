# Player identity and automatic score submission

The game now uses the Supabase Auth user UUID as the real player ID. Arcade initials remain intentionally reusable; the leaderboard displays a short discriminator such as `RAM·3F8A`, and the signed-in player's rows also receive a `YOU` marker.

Anonymous Auth creates the player automatically on first use. That identity persists in the browser. Adding an email upgrades it into a restorable player, so the same UUID, profile, and personal bests can be used on another device.

## Deploy in this order

1. Run `supabase-leaderboard-control-method.sql` if it has not already been applied.
2. Run `supabase-leaderboard-game-mode.sql` if it has not already been applied.
3. In the Supabase dashboard, enable anonymous sign-ins.
4. Enable the Email provider and manual identity linking.
5. Change the email authentication template to show the eight-digit `{{ .Token }}` value. The in-game flow expects a code, not a confirmation-link-only email.
6. Run `supabase-player-identity-auto-submit.sql` in the SQL editor.
7. Deploy the updated `snake-game-turn.html`.

The built-in Supabase email sender is sufficient for the current testing scope. Custom SMTP can be added later if broader public email delivery or higher email limits are needed.

Do not deploy the HTML before the final migration unless a short maintenance window is acceptable. The game detects a missing migration and shows `Leaderboard database update required`; it does not fall back to insecure direct inserts.

## Resulting score rules

- One row is kept per player, game mode, and control method.
- A row changes only when the new score is higher.
- Classic and Sprint remain separate.
- D-PAD, TURN, and KEYBOARD remain separate.
- Mixed-control runs remain unranked.
- Legacy rows stay readable and do not gain player ownership retroactively.
- Network failures queue the best pending score locally and retry when the device is online.
- Auto-submit is enabled by default and can be disabled in the Player panel.

## Verification checklist

1. Open a fresh private window and confirm the main menu says `Player: Guest`.
2. Score at least one point, enter initials, and confirm the score submits.
3. Open the leaderboard and confirm the name includes a discriminator and the row says `YOU`.
4. Beat that score and confirm the same leaderboard row updates rather than creating another row.
5. Submit a lower score and confirm the personal best does not change.
6. Save the player by email, enter the eight-digit code, and confirm the Player panel says the player is saved.
7. On another browser/device, choose Restore Player, verify the code, and confirm the same display identity and `YOU` row return.
8. Test Classic/Sprint and D-PAD/TURN/KEYBOARD independently.

Anonymous players are durable on the current browser but cannot be recovered after site data is cleared. Email saving is the recovery mechanism. The short public code is only a friendly display discriminator; the Supabase Auth UUID is the authoritative unique ID.
