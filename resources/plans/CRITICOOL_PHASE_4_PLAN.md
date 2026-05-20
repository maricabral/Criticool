# CritiCool Phase 4 Plan

Date: 2026-05-19
Last updated: 2026-05-20

## Summary

Phase 4 makes CritiCool safer to hand to closed beta testers by adding account settings and recovery flows. The phase stays focused: no push notifications, invite system, TMDB jobs, watchlist, admin dashboard, or feed redesign.

Primary outcome: a tester can edit only the MVP account identity fields, verify or change email through a dev-token flow, reset a forgotten password, permanently delete their account, and move through friend profile review detail without losing source-tab context, then pass mobile QA on a restarted API and Expo app.

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

Required follow-up before Phase 4 sign-off:

- Fix the friend-review navigation regression where `Friends -> friend profile -> review detail` highlights the `Me` tab on review detail.
- Add focused tests for the source-tab behavior so future profile/review navigation changes cannot reintroduce the regression.

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
  - When a review is opened from that friend profile, keep Friends selected on review detail instead of switching the tab bar to Me.
  - The review detail `Back` pill must return to the friend profile with Friends still selected; the friend profile `Back` pill then returns to Friends.
  - Treat friend profile and friend review detail as overlays over their source tab. Do not infer the bottom-tab state only from the internal profile route.
  - Add the official `Back` pill on friend profiles opened from another tab.

## Friend Review Detail Regression Fix

Reproduction path:

1. Open `Friends`.
2. Pick a friend.
3. Pick one of that friend's reviews.
4. Observe that the review detail screen currently marks `Me` as the active bottom tab.

Required behavior:

- Review detail opened from a friend profile must keep the originating tab active. For the reproduction path above, the active tab remains `Friends`.
- Review detail opened from the viewer's own `Me` profile still keeps `Me` active.
- Review detail opened from `Feed` or notifications should preserve that entry source where possible, instead of pretending the user is on `Me`.
- `Back` on friend review detail clears only the selected review and returns to the friend profile. It must not clear the selected friend profile or jump to the viewer's own profile.
- The friend profile `Back` pill remains the right-side pink `Back` pill from `resources/mockups/preview/phase-4-profile-settings.html`.

Implementation approach:

- Store explicit navigation provenance for review detail, such as `reviewBackTab` or a shared `sourceTab`, when opening a review.
- When opening a review from a friend profile, copy the friend profile source tab (`Friends` in the bug path) into review detail provenance.
- Resolve the tab bar's active tab from review-detail provenance first, then friend-profile provenance, then the current top-level tab.
- Keep `selectedProfileUser` intact while review detail is open so returning from review detail lands on the same friend profile.
- Prefer extracting the profile/review navigation transitions into a small pure helper or reducer so this behavior can be unit tested without relying only on emulator QA.

## Public API And Type Changes

- Extend shared `AuthUser` with:
  - `emailVerifiedAt: string | null`
  - `pendingEmail: string | null`
- Add request/response DTOs for profile update, verification token request, token verification, password reset request/completion, and account deletion.
- Keep existing avatar fields in shared summaries for compatibility, but the mobile MVP uses generated letter avatars only.
- Update the mobile API client with the account endpoints and refresh top-level user state after profile changes.

## Test Plan

- Backend tests cover profile updates, duplicate identity conflicts, pending-email promotion, token hashing/expiry/reuse prevention, password reset session revocation, and hard-delete cleanup.
- Mobile navigation regression tests cover:
  - `Friends -> friend profile -> review detail` keeps `Friends` active on the tab bar.
  - Pressing the review detail `Back` pill returns to the same friend profile with `Friends` still active.
  - Pressing the friend profile `Back` pill returns to the Friends list.
  - `Me -> own review -> review detail` keeps `Me` active, proving the fix does not break own-profile review navigation.
  - A review opened from `Feed` keeps `Feed` active, proving review detail source-tab provenance is not hard-coded to Friends.
- If mobile component testing remains unavailable, add a pure navigation-state helper/reducer and cover these cases with Vitest before app-level QA.
- Mobile verification:
  - `npm run build --workspaces --if-present`
  - `npm test`
  - `npm run qa:smoke`
  - Restart API with `npm run dev:api` because the app-facing account API changed.
  - Restart Expo with `npm run dev:mobile` because the mobile UX changed.
  - Manually QA register, verify email, edit display name/username/email, change pending email, reset password from logged-out state, login with new password, open a friend profile from Friends, open that friend's review, confirm the Review screen keeps Friends selected, return with Back to the friend profile, return with Back to Friends, and hard-delete account.

## Assumptions

- Phase 4 targets closed beta testers, not public launch.
- Dev-token responses are acceptable; real outbound email is deferred.
- Hard delete is intentional and irreversible.
- Reset password is included; signed-in password change is deferred.
- Avatar upload/storage and avatar URL editing are deferred; the MVP uses generated avatar letters.
- Bio editing is deferred.
- The final implementation commit must include this file at `resources/plans/CRITICOOL_PHASE_4_PLAN.md`.
