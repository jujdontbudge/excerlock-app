---
name: excerlock-access
description: Give, check or end free ExcerLock Premium for a creator or partner by email. Use when someone asks to comp, gift, grant, give free access, unlock Premium, or revoke access for an ExcerLock user, UGC creator, influencer or partner.
---

# Free ExcerLock Premium by email

One command, `excerlock-access`, talks to the ExcerLock server. Nothing else is needed: no repo, no logins, no dashboards.

## Do it

```sh
excerlock-access grant creator@gmail.com --note "UGC @handle, October TikTok"
excerlock-access grant creator@gmail.com --note "UGC @handle, 3-month deal" --until 2027-01-31
excerlock-access check creator@gmail.com
excerlock-access revoke creator@gmail.com --note "campaign ended"
```

Each command prints one line that starts with `GRANTED`, `ACTIVE`, `NONE`, `REVOKED`, `NOTHING TO REVOKE` or `ERROR`. Report that line to the human as it is.

## Rules

1. **Use the exact email the creator will sign in with.** Ask them for it. Do not guess or fix it: `john.smith@gmail.com` and `johnsmith@gmail.com` are different here. If they use "Sign in with Apple" and hide their email, the address is their `@privaterelay.appleid.com` one, so ask them to use email code sign-in instead.
2. **Always write a useful `--note`:** who they are (handle), which campaign, and who approved it. The note is the audit trail.
3. **`--until` is optional.** Without it, access never ends. The date is when access stops (start of that day, UTC). Use it for fixed-length deals.
4. **Granting again replaces the previous grant**, including its end date. Run `check` first if you are unsure what they have.
5. **Grant once.** If the result is unclear (network error or server error), run `check` before trying again.
6. **Never** share, print, copy or move the access token. It lives in `~/.config/excerlock-access/token`, readable only by this Mac user, and survives restarts and screen locks. Run `setup` only when the human asks you to (for example after `access token was rejected`), then give them the `label:hash` line it prints for Johan. Running `setup` replaces the old token, so the old line stops working once Johan swaps it.
7. **Do not use this for paying customers' billing problems or refunds.** Revoke never cancels or refunds a paid subscription.

## What to tell the creator after `GRANTED`

> Download ExcerLock from the App Store, open it, tap **Already have an account? Sign in**, then tap **Continue with Google** if it is a Gmail address, or **Continue with email** and type the code we email you. Use exactly *their email*. Premium unlocks with no payment. If you already have the app, sign out and back in with that email.

There is no separate sign-up: the first sign-in with that email creates the account. Steer creators to Google or the email code, not **Continue with Apple**, which can hide their real address.

`check` also says whether they have signed in and received access yet. Use it to follow up.

## Errors

| Output | Meaning | Do |
|---|---|---|
| `No access token on this Mac` | Setup not done | Run `excerlock-access setup marketing-air` and give the human the line for Johan |
| `access token was rejected` | Token switched off or replaced | Ask Johan |
| `access service is not switched on yet` | Server not configured | Ask Johan |
| `Too many requests` | More than 20 per minute | Wait a minute |
| `Request rejected: …` | Bad email, note or date | Fix the input |
| `Server error` / `Could not reach` | Network or server problem | Run `check`, then retry once |
