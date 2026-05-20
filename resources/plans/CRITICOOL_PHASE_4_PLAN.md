# CritiCool Phase 4 Plan

Date: 2026-05-19
Last updated: 2026-05-20

## Summary

Phase 4 makes CritiCool safer to hand to closed beta testers by adding account settings and recovery flows. The phase stays focused: no push notifications, invite system, TMDB jobs, watchlist, admin dashboard, or feed redesign.

Primary outcome: a tester can edit only the MVP account identity fields, verify or change email through a dev-token flow, reset a forgotten password, and permanently delete their account, then pass mobile QA on a restarted API and Expo app.

## UX Approval Rule

- Every future UX design change must be approved by the user before app implementation.
- The proposed UX must be published as a visual HTML preview under `resources/mockups/preview/`.
- The implementation summary must link the preview path so the user can inspect the visual change directly, not only through a text description.
- The official mobile back control is the right-side pink `Back` pill shown in the approved preview.
- Current Phase 4 preview: `resources/mockups/preview/phase-4-profile-settings.html`.

## Implementation Status

Implemented in this rollout:

- Account lifecycle migration with verification/reset token storage.
- Profile identity edit, pending-email verification, password reset, and hard-delete APIs.
- Logged-out forgot-password flow.
- Separate mobile account settings page opened from `Me`, with the official `Back` pill.
- MVP settings fields limited to display name, username, and email.
- Letter-only avatars in the mobile UX; avatar URL editing is not part of the MVP.
- Profile stats without average rating.
- Friend profile navigation that keeps the source tab active and provides a back button.
- Shared user/account types and mobile API client methods.
- Unit coverage plus smoke coverage for the new account lifecycle path.

## Key Changes

- Add account lifecycle schema support:
  - `emailVerifiedAt`, `pendingEmail`, and account token storage for `email_verification`, `email_change`, and `password_reset`.
  - Store only token hashes; raw tokens are returned only for the dev/closed-beta flow when enabled.
  - Keep old email active until pending-email verification succeeds.
- Add API flows:
  - `GET /me` returns verification state and pending email.
  - `PATCH /me` updates display name, username, and email only for the MVP settings flow.
  - Add request/consume endpoints for email verification and password reset.
  - `DELETE /me` hard-deletes the authenticated account after a destructive confirmation in the app.
- Add mobile account settings:
  - Settings is a separate screen with the official `Back` pill, not an embedded panel inside `Me`.
  - Support editing display name, username, and email.
  - Remove bio, locale, and avatar URL inputs from the MVP settings UX.
  - Show email verification status, pending email status, dev token output, and token entry controls.
  - Add logged-out "Forgot password?" flow.
  - Show delete account as a single destructive button.
- Update profile navigation:
  - Remove average rating from user profiles.
  - When a friend profile is opened from Friends, keep Friends selected in the tab bar.
  - Add the official `Back` pill on friend profiles opened from another tab.

## Public API And Type Changes

- Extend shared `AuthUser` with:
  - `emailVerifiedAt: string | null`
  - `pendingEmail: string | null`
- Add request/response DTOs for profile update, verification token request, token verification, password reset request/completion, and account deletion.
- Keep existing avatar fields in shared summaries for compatibility, but the mobile MVP uses generated letter avatars only.
- Update the mobile API client with the account endpoints and refresh top-level user state after profile changes.

## Test Plan

- Backend tests cover profile updates, duplicate identity conflicts, pending-email promotion, token hashing/expiry/reuse prevention, password reset session revocation, and hard-delete cleanup.
- Mobile verification:
  - `npm run build --workspaces --if-present`
  - `npm test`
  - `npm run qa:smoke`
  - Restart API with `npm run dev:api` because the app-facing account API changed.
  - Restart Expo with `npm run dev:mobile` because the mobile UX changed.
  - Manually QA register, verify email, edit display name/username/email, change pending email, reset password from logged-out state, login with new password, open a friend profile from Friends and return with Back, and hard-delete account.

## Assumptions

- Phase 4 targets closed beta testers, not public launch.
- Dev-token responses are acceptable; real outbound email is deferred.
- Hard delete is intentional and irreversible.
- Reset password is included; signed-in password change is deferred.
- Avatar upload/storage and avatar URL editing are deferred; the MVP uses generated avatar letters.
- Bio editing is deferred.
- The final implementation commit must include this file at `resources/plans/CRITICOOL_PHASE_4_PLAN.md`.
