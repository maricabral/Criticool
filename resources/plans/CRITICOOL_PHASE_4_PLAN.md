# CritiCool Phase 4 Plan

Date: 2026-05-19

## Summary

Phase 4 makes CritiCool safer to hand to closed beta testers by adding account settings and recovery flows. The phase stays focused: no push notifications, invite system, TMDB jobs, watchlist, admin dashboard, or feed redesign.

Primary outcome: a tester can edit their identity, verify or change email through a dev-token flow, reset a forgotten password, and permanently delete their account, then pass mobile QA on a restarted Expo app.

## Implementation Status

Implemented in this rollout:

- Account lifecycle migration with verification/reset token storage.
- Profile identity edit, pending-email verification, password reset, and hard-delete APIs.
- Mobile forgot-password flow and `Me` account settings panel.
- Shared user/account types and mobile API client methods.
- Unit coverage plus smoke coverage for the new account lifecycle path.

## Key Changes

- Add account lifecycle schema support:
  - `emailVerifiedAt`, `pendingEmail`, and account token storage for `email_verification`, `email_change`, and `password_reset`.
  - Store only token hashes; raw tokens are returned only for dev/closed-beta flow when enabled.
  - Keep old email active until pending-email verification succeeds.
- Add API flows:
  - `GET /me` returns verification state and pending email.
  - `PATCH /me` updates display name, username, email, bio, locale, and avatar URL.
  - Add request/consume endpoints for email verification and password reset.
  - `DELETE /me` hard-deletes the account after current-password plus username confirmation.
- Add mobile account settings:
  - Add an own-profile settings area under `Me`.
  - Support editing display name, username, email, bio, locale, and avatar URL.
  - Show email verification status, pending email status, dev token output, and token entry controls.
  - Add logged-out "Forgot password?" flow.
  - Add danger-zone hard delete, then clear local session.

## Public API And Type Changes

- Extend shared `AuthUser` with:
  - `emailVerifiedAt: string | null`
  - `pendingEmail: string | null`
- Add request/response DTOs for profile update, verification token request, token verification, password reset request/completion, and account deletion confirmation.
- Update the mobile API client with the new account endpoints and refresh top-level user state after profile changes.

## Test Plan

- Backend tests cover profile updates, duplicate identity conflicts, pending-email promotion, token hashing/expiry/reuse prevention, password reset session revocation, and hard-delete cleanup.
- Mobile verification:
  - `npm run build --workspaces --if-present`
  - `npm test`
  - `npm run qa:smoke`
  - Restart API if changed.
  - Restart Expo with `npm run dev:mobile`.
  - Manually QA register, verify email, edit profile, change pending email, reset password from logged-out state, login with new password, and hard-delete account.

## Assumptions

- Phase 4 targets closed beta testers, not public launch.
- Dev-token responses are acceptable; real outbound email is deferred.
- Hard delete is intentional and irreversible.
- Reset password is included; signed-in password change is deferred.
- Avatar upload/storage is deferred; avatar URL editing is allowed.
- The final implementation commit must include this file at `resources/plans/CRITICOOL_PHASE_4_PLAN.md`.
