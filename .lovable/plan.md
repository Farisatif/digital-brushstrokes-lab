

## Two fixes: pills flying off & blocking page scroll + admin password reset

### 1. Skills pills fly off-screen on touch and block page scroll

**What's happening on mobile (your viewport 457×757):**

Looking at `src/components/PhysicsPills.tsx`:

1. **Pills disappear upward when tapped:** the `onTouchStart` handler stores `touchState`, but it does NOT prepare the `mouse` object. Then `onTouchMove`, when it decides "drag", manually sets `mouse.position`, `mouse.mousedownPosition`, and `mouseConstraint.body`. The very-soft `MouseConstraint` (`stiffness: 0.22`) plus a stale `mouse.mousedownPosition` from a previous interaction creates a huge constraint vector — the pill is yanked toward the previous touch coordinate at high speed, flies upward past the top wall (the top is open: only floor + left + right walls exist) and never comes back. The cleanup interval only removes pills that go below `y > h + 200`, so escaped pills are also never recycled. Fix:
   - Add a **top wall** (same pattern as `floor`): `Bodies.rectangle(width / 2, -WALL_T / 2, width * 2, WALL_T, wallOpts)` so a stuck/runaway pill cannot leave the canvas vertically.
   - Extend the cleanup sweeper to also catch `y < -300` (in case anything still tunnels through during spawn).
   - In `onTouchStart`, when `hit` is non-null, **immediately** set `mouse.position = mouse.mousedownPosition = pt` and `mouse.button = 0` so the constraint, when later attached, has a correct anchor instead of an old one.
   - Stiffen the touch-drag constraint slightly (only on touch, not on mouse): set `mouseConstraint.constraint.stiffness = 0.35` while a touch drag is active and restore on `touchend`. This keeps the desktop "weighty" feel but stops the mobile slingshot.
   - Clamp the dragged body's velocity each tick during a drag: if `|v| > 25`, scale it down. Prevents the constraint solver from accumulating runaway energy.

2. **Page won't scroll over the canvas:** the wrapper has `style={{ touchAction: "pan-y" }}` — good — but the canvas itself also has `touchAction: "pan-y"`, AND `onTouchMove` is registered with `{ passive: false }` and unconditionally calls `e.preventDefault()` once it has decided "drag". Combined with the bug above (touches that hit empty canvas area can still mis-classify as drags because `bodyHit` is briefly truthy from a previous gesture), vertical scrolling is killed. Fix:
   - Reset `touchState` to `null` at the start of every `onTouchStart` (currently a stale state from a never-fired `touchend` can persist).
   - When `bodyHit` is null, set `touchState.decided = "scroll"` immediately on `touchstart` (not on first move). Today the decision waits for movement, which holds the browser's scroll-arbitration up.
   - Only call `e.preventDefault()` inside `onTouchMove` if `decided === "drag"` AND `bodyHit !== null`. Otherwise let the browser scroll the page natively.
   - Lower `DRAG_THRESHOLD` to `2` so the scroll/drag decision happens faster.
   - Add `touchAction: "manipulation"` ONLY when a body was hit; otherwise keep `pan-y`. Implemented by toggling the canvas's inline `touch-action` style on `touchstart`/`touchend`.

3. **Replay the spawn flow when pills get stuck:** the existing "Replay" button already calls `spawnAll`, which removes all bodies and re-creates them. With the top wall added, this becomes a reliable recovery path. No new UI needed.

### 2. "خطأ في كلمة السر" — password is correct but rejected

Diagnosis: the `admin_settings` row exists (verified — `password_hash` is a 60-char bcrypt). `checkPassword` in `src/utils/settings.functions.ts` compares the entered password against that stored hash using `bcrypt.compare`. The hash was created **once** from the value of the `SETTINGS_ADMIN_PASSWORD` secret on first use (line 72 of `settings.functions.ts`). If the secret value was changed afterward in Lovable Cloud, the hash in the DB still reflects the **original** secret, so the new value of `SETTINGS_ADMIN_PASSWORD` will always be rejected — that's exactly the symptom: "the password is correct but it says wrong."

There is also a forgot-password flow in `SettingsDrawer.tsx` that uses a recovery code, but you don't have the recovery code (we never showed it after the first auto-init — only logged it server-side).

**Fix:** add a one-shot "force-reseed" server function that re-hashes the **current** value of the `SETTINGS_ADMIN_PASSWORD` secret into `admin_settings`, plus generates a new recovery code and returns it once so you can save it. This is gated by knowing the secret value (which you set in Lovable Cloud), so it's secure: only a request that includes the exact current secret string will succeed.

Concretely:

- In `src/utils/settings.functions.ts`, add `reseedAdminFromSecret({ secret })`:
  - Reads `process.env.SETTINGS_ADMIN_PASSWORD`.
  - Returns `{ ok: false, error: "Reseed not allowed" }` unless `secret === process.env.SETTINGS_ADMIN_PASSWORD` (constant-time compare).
  - Generates a new recovery code, hashes the secret as the new password hash, upserts `admin_settings`, and returns `{ ok: true, newRecoveryCode }`.
  - Same in-memory rate limiter as the other endpoints.
- In `src/components/cms/SettingsDrawer.tsx`, on the lock screen, under the existing "Forgot password?" link, add a second small link: **"Re-sync admin password from Cloud secret"**. Opens a tiny inline panel with one input ("Paste the current SETTINGS_ADMIN_PASSWORD value") and a "Re-sync" button. On success: shows the new recovery code (copy button, "I saved it" to dismiss) and tells you to log in normally with the same secret as your password.

This unblocks login without DB migrations and gives you a working recovery code going forward. After re-sync, the existing "Forgot password?" + "Change password" flows work as designed.

### Files modified

- `src/components/PhysicsPills.tsx` — add top wall, extend cleanup bounds, fix touch handler ordering + scroll arbitration, clamp drag velocity, toggle `touch-action`.
- `src/utils/settings.functions.ts` — add `reseedAdminFromSecret` server function (rate-limited, secret-gated).
- `src/components/cms/SettingsDrawer.tsx` — add inline "Re-sync admin password from Cloud secret" panel under the lock screen, wired to the new server function, with new-recovery-code reveal UI.

### Notes

- No DB schema changes, no migrations, no new dependencies.
- The reseed endpoint requires you to paste the exact value of the `SETTINGS_ADMIN_PASSWORD` secret you set in Lovable Cloud → Connectors → Lovable Cloud → Secrets. If you don't remember it, set a fresh value there first, then use it both to re-sync and as the new login password.
- All physics changes respect the existing `prefers-reduced-motion` and IntersectionObserver gating.

