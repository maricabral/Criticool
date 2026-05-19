# CritiCool Phase 3 Plan And Completion Notes

Date: 2026-05-18
Completed: 2026-05-19
Implementation commits:

- `e64e4e6` Execute CritiCool phase 3
- `b8b85c8` Fix review navigation and translation UX
- `ca2057c` Restore unblock flow without removing friendships
- `f9dab86` Add half-popcorn review ratings
- `031dd80` Use tap toggle for half-popcorn ratings
- `990909c` Enlarge rating popcorns and collapse tag pills

## Summary

Phase 3 turned the Phase 2 social foundation into a stronger MVP/beta candidate. The completed work stayed movie-review focused: privacy polish, review management, friend/profile clarity, on-demand translation, report/block improvements, and broader automated QA.

Important product correction after implementation: CritiCool remains review-first in the mobile app. Review cards must open the review detail, not a movie detail screen. The mobile movie detail screen was removed from navigation after review because it made existing reviews harder to access. The API still exposes authenticated movie detail data for future use, but the mobile app does not route feed/profile review interactions there.

Important friendship correction after implementation: blocking a friend must not delete the accepted friendship. Blocked friends are hidden from normal social/review surfaces while blocked and are available in a `Blocked` management section. Unblocking removes the block and restores the existing friend to `Your friends` without requiring a new friend request.

## Key Changes

- Completed the Phase 2 privacy follow-up by excluding blocked comment authors from feed `commentCount`, feed `commentParticipants`, review detail `commentCount`, and tests.
- Expanded `GET /movies/:id` into an authenticated movie detail API response with cached movie metadata, viewer review, and friends' recent reviews. This is API-ready but not a mobile navigation destination in the current review-first UX.
- Added mobile edit/delete review flows using the existing `PATCH /reviews/:id` and `DELETE /reviews/:id` endpoints. Editing reuses the Post form and pre-fills rating, quick take, body, tags, and spoiler state. Delete requires confirmation.
- Preserved review-first navigation: feed/profile review cards open review detail; own reviews are accessible without entering edit mode.
- Restored friend/profile navigation from avatars. Friend avatars open a friend profile/reviews view backed by a visibility-aware `GET /feed/users/:id` endpoint.
- Improved profile and friends polish with stable review/friend counts, average rating, top tags from loaded reviews, clearer incoming/outgoing/accepted friend states, and better empty/error states without showing email.
- Improved report/block UX by collecting reason/details for reports, refreshing affected state after blocking, and restoring a visible unblock path.
- Preserved accepted friendships through block/unblock. Blocking may clear pending friend requests, but it must not delete an accepted friendship row.
- Added on-demand translation for user-generated review and comment text. Original text is preserved, translated text can be toggled back to `Show original`, and movie catalog metadata is not translated.
- Added half-popcorn review ratings. The mobile Post/Edit rating picker now supports `0.5` increments, renders half-filled popcorn icons, and uses repeated tapping on the selected popcorn to toggle between full and half values. Rating popcorns were enlarged for touch clarity.
- Collapsed review tag pills in the Post/Edit form. Tags are still supported and capped at 5 selections, but the tag picker now stays hidden behind `Browse tags` until the user asks for it, keeping the review form less crowded.

## API And Type Changes

- Shared types now include `MovieDetail`, `MovieReviewSummary`, translation target/response types, and user `locale`.
- `GET /movies/:id` requires the current user and returns permission-aware `viewerReview` and `friendsReviews`.
- Review edit/delete remain on `PATCH /reviews/:id` and `DELETE /reviews/:id`.
- Review `rating` remains numeric and is now explicitly validated as a `0.5` increment between `0` and `5` on create/update. Existing whole-popcorn values remain valid.
- `POST /translations` supports `review` and `comment` targets, runs the same visibility checks as review detail, returns only translated user-generated fields, and caches by target, target update version, source locale, and target locale.
- Translation cache is persisted in the new `translation_caches` table.
- The translation adapter supports a custom `TRANSLATION_ENDPOINT_URL` and defaults to a provider-backed Google translate path. `TRANSLATION_PROVIDER="passthrough"` can be used for local no-op behavior.
- Mobile uses the user locale when set and falls back to the device locale for translation target selection.
- `GET /feed/users/:id` returns visible friend reviews for friend profile pages and rejects strangers/blocked relationships.
- `GET /users/blocked` returns the viewer's blocked users for unblock management.
- `POST /users/:id/block` preserves accepted friendships and only removes non-accepted/pending friendship state.
- `DELETE /users/:id/block` removes the viewer's block. If the users were accepted friends before blocking, `GET /friends` should show that friend again after unblock.

## Test Plan

Completed verification:

- `npm run build --workspaces --if-present`
- `npm test`
- `npm run qa:smoke`

Automated coverage now includes:

- Blocked comment counts and feed participant normalization.
- Movie detail API visibility, viewer existing review, and friend review ordering.
- Friend profile review visibility through `GET /feed/users/:id`.
- Translation permission checks, deleted/inaccessible content rejection, cache reuse, and preserving original text.
- Review edit/delete behavior.
- Review DTO validation accepts half-popcorn ratings such as `3.5` and `4.5`, and rejects non-step values such as `4.7`.
- Report details and block-driven refresh/privacy behavior.
- Block/unblock behavior where accepted friends are hidden while blocked, listed in blocked-user management, and restored after unblock without re-adding.

Manual mobile QA checklist for this completed phase:

- Feed review card opens review detail.
- Profile review card opens review detail.
- Own review detail exposes Edit, but edit is not required to read the review.
- Search/Post still let a user pick a movie for a new review.
- Post/Edit rating picker supports half-popcorn ratings: first tap selects the whole popcorn value, tapping the selected popcorn again toggles to the half value below it, and the numeric label reflects the selected score.
- Post/Edit rating popcorns are large enough to tap comfortably on mobile.
- Post/Edit tags are hidden by default and open only through `Browse tags`; selected tag count is shown in the section header.
- Friend avatar opens friend profile/reviews.
- Friend profile reviews hide from strangers and blocked users.
- Translate/Show original works on review body, quick take, and comment text.
- Report form collects reason/details.
- Blocking a user removes their comments from visible counts and participant avatars.
- Blocking an accepted friend does not destroy the friendship.
- Blocked friends appear in the Friends screen's blocked-user management section.
- Unblocking an accepted friend restores them to `Your friends` without sending a new request.

## Assumptions

- Phase 3 remains movie-only.
- Translation is on-demand and provider-backed from the API; full app chrome localization is deferred unless a specific beta locale is chosen.
- Browser speech recognition stays the only in-app dictation path for now; native dictation remains documented as requiring a custom development build.
- Push notifications, admin moderation dashboard, global explore feed, watchlist, public profiles, and multi-category review subjects stay deferred.
- The existing visual/design contract in `README.md` remains authoritative for mobile UI work.
- Review-first navigation is authoritative for mobile: movie metadata supports the review workflow, but review cards should not route to a movie-detail page.
- Accepted friendship preservation is authoritative for block/unblock: privacy filtering should hide blocked users while blocked, but unblock must restore the previous accepted friend relationship.
