# CritiCool Phase 3 Plan

Date: 2026-05-18

## Summary

Phase 3 should turn the Phase 2 social foundation into a polished MVP/beta candidate. The focus is not new categories, global discovery, native push, or admin tooling; it is closing the remaining movie-review product gaps, improving review management, making profiles/friend states clearer, and tightening QA around privacy.

Phase 2 audit result: the implementation is largely applied and verified by the current test/build suite. The main follow-up is privacy polish around blocked comment authors: review detail hides blocked users' comment rows, but user-visible comment counts and feed participant avatars should also exclude comments from users blocked either way.

## Key Changes

- Close the Phase 2 privacy follow-up by excluding blocked comment authors from feed `commentCount`, feed `commentParticipants`, review detail `commentCount`, and related tests.
- Add a real movie detail experience. Expand `GET /movies/:id` into an authenticated movie detail response with poster/backdrop, title/year, overview, runtime/status when cached, the viewer's existing active review, and friends' recent reviews. Add a shared `MovieDetail` type and mobile API method.
- Build a mobile movie detail screen reachable from Search results, buzz movies, selected Post movie, and review cards. It should show movie art/metadata, friends' reviews, and a single clear CTA: write a review if none exists, otherwise open/edit the existing review.
- Add mobile edit/delete review flows using the existing `PATCH /reviews/:id` and `DELETE /reviews/:id` endpoints. Editing should reuse the current Post form structure, prefill rating/quick take/body/tags/spoiler state, and delete should require confirmation.
- Improve profile and friends polish: show stable review/friend counts, average rating, top tags from loaded reviews, clearer incoming/outgoing/accepted friend states, and better empty/error states without showing email.
- Improve report/block UX by collecting a short reason/details for reports and refreshing affected feed/friend/detail state after a block.

## API And Type Changes

- Extend shared types with `MovieDetail`, `MovieReviewSummary`, and optional `viewerReview`.
- Update `GET /movies/:id` to require the current user in the service layer so friends' reviews and viewer review are permission-aware.
- Keep review edit/delete on existing routes: `PATCH /reviews/:id` and `DELETE /reviews/:id`.
- Do not add new notification, push, admin, or global feed APIs in Phase 3 unless needed to support the movie detail/profile flows above.

## Test Plan

- Backend tests: blocked comment counts/participants, movie detail visibility for self/friend/stranger/blocked/deleted reviews, viewer existing review, and friends' review ordering.
- Mobile type/build checks: `npm run build --workspaces --if-present`.
- Existing unit suite: `npm test`.
- Smoke QA: extend `scripts/qa-smoke.mjs` to cover movie detail, existing-review CTA behavior, review edit, review delete, and blocked-comment count normalization.
- Manual mobile QA: restart Expo after mobile changes, then verify search -> movie detail -> create review, feed -> review detail -> edit/delete own review, friend review visibility, blocked user disappearance, and report submission.

## Assumptions

- Phase 3 remains movie-only.
- Browser speech recognition stays the only in-app dictation path for now; native dictation remains documented as requiring a custom development build.
- Push notifications, admin moderation dashboard, global explore feed, watchlist, public profiles, and multi-category review subjects stay deferred.
- The existing visual/design contract in `README.md` remains authoritative for mobile UI work.
