# Admin access

## What changed, and why

The control panel used to authenticate with its own token: an integer derived
from the current UTC date and hour.

```python
# removed in v0.15.0
(now.day + now.month) * now.year + now.hour
```

Three things were wrong with it, in increasing order of seriousness:

1. **The derivation was in a public repository.** Anyone reading the source
   could compute a valid token.
2. **It bypassed login entirely.** No account was required — not a deactivated
   one, not any one. The check never touched the users table.
3. **It only accepted three values at a time.** Even without the source, the
   keyspace was small enough to walk through by hand.

With that token you could list every user (names, emails), flip anyone's admin
flag, deactivate accounts and trigger password resets.

Making the repository private would not have fixed this, and neither would a
cleverer formula. Obscurity is not a control.

## How it works now

**`/api/v1/sys/*` uses the same bearer token as the rest of the API**, plus the
`is_admin` flag on the account (`get_current_admin` in `app/api/deps.py`). There
is no second door and no password to know. Reading this repository tells you
exactly how the check works and grants you nothing.

**Admin is granted out of band**, with a shell on the machine that runs the
database:

```bash
docker compose exec backend python -m app.cli list-admins
docker compose exec backend python -m app.cli grant-admin you@example.com
docker compose exec backend python -m app.cli revoke-admin them@example.com
```

The account must already exist — sign up through the normal flow first. The CLI
refuses to remove the last admin.

**Every privileged action is recorded.** `admin_audit_log` stores the actor, the
action, the target and the time. Emails are copied into the row rather than
joined, so the trail survives the account being deleted. The panel renders it
under *Admin activity*.

**The panel cannot be used to lock yourself out.** You cannot deactivate your own
account, you cannot change your own admin flag, and the last admin cannot be
demoted through the API.

## Presence

`users.last_seen_at` is stamped by `get_current_user` at most once a minute
(`PRESENCE_WRITE_INTERVAL`), so an active session costs one extra write per
minute rather than one per request. "Online" means seen in the last five minutes
(`ONLINE_WINDOW`); "active" means logged in within thirty days.

## Step-up (two-factor) on destructive actions

The session proves you are an admin. It does not prove you are the one at the
keyboard — an unlocked laptop is enough to hand someone else your session. So
three actions ask for a code from your authenticator:

| Action | Step-up |
|---|---|
| Grant or revoke admin | required |
| Deactivate or reactivate an account | required |
| Force a password reset | required |
| Email one or more users | required |
| Remove your own authenticator | required |
| Reading the panel, marking verified, editing the donation target | not required |

Email is on that list for the same reason as the rest: it cannot be unsent, and
it is the most externally visible thing the panel does.

**A code opens a five-minute window**, rather than being demanded once per
click — a run of admin work costs one code, not six.

**The window is bound to the browser that passed the check.** Verifying returns
a random token that lives in React state and never touches `localStorage`;
guarded requests carry it in `X-Admin-Step-Up`. A session copied onto another
device does not inherit the unlock, and closing the tab ends it. Only the
token's SHA-256 is stored, so the database never holds the bearer value.

**A code cannot be replayed.** The time step of an accepted code is recorded,
so the same six digits are refused for the rest of their own thirty seconds.

**Wrong codes are throttled** — five failures and the account waits five
minutes. Be precise about what that buys: the counter lives in process memory,
and production runs uvicorn with four workers, so the real ceiling is five
attempts *per worker* and it resets on every deploy. Twenty guesses per five
minutes against a six-digit code is still nowhere, and you need a valid admin
session before you can guess at all. The parts that must not be per-process —
the replay guard and the window itself — are in the database.

The endpoints return machine-readable details so the panel can react without
guessing: `totp_enrolment_required` (open the setup), `totp_required` (ask for a
code). Both are **403** rather than 401 — a 401 would send the API client down
its "session is dead" path and sign the admin out mid-action.

Enrolment is standard TOTP: `/sys/totp/begin` hands out a secret and an
`otpauth://` URI, the panel renders it as a QR, and the secret counts for
nothing until `/sys/totp/confirm` proves a code can be read off it. Google
Authenticator, 1Password, Authy — anything that does TOTP.

**`begin` reuses a pending secret.** Minting a new one per call was a bug worth
naming, because the failure is invisible: the endpoint is reached both from the
setup button and automatically when a guarded action needs enrolment, so
reopening the screen silently replaced the secret while the authenticator kept
the entry it had already stored. Every entry carries the same issuer and
account name, so the dead one cannot be told from the live one — the symptom is
"I scanned the QR and the code is rejected", with no clue why.
`POST /sys/totp/begin?reset=true` is the deliberate way to start over, surfaced
in the panel as "Codes rejected? Get a new QR".

### If you lose the authenticator

Only the server can clear it:

```bash
docker compose exec backend python -m app.cli reset-totp you@example.com
```

That is deliberate. If the panel could clear it, whoever held the session could
clear it too, and it would not be a second factor. `list-admins` shows who has
one set up.

## Rate limiting elsewhere

The TOTP throttle above is not the only one any more. `/auth/login` and
`/auth/forgot-password` are limited in `app/core/ratelimit.py`; login also
carries a per-account lock in the database, which is the case in-memory
counters cannot cover. `/sys/*` reads are still unlimited — least urgent,
since you must already hold an admin session to reach them.
