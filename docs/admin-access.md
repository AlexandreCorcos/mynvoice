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

## Still open

**Step-up authentication for destructive actions.** Granting admin, deactivating
an account and sending a password reset are currently protected only by the
session. A stolen laptop with an unlocked browser is enough. A TOTP prompt on
those three actions specifically would close it. Not implemented — it needs
`pyotp`, a migration for the secret, and an enrolment screen.

**Rate limiting.** Nothing throttles `/sys/*`. It matters least here (you must
already be an admin) but it is the obvious next control.
