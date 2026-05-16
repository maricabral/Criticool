# CritiCool Phase 2 Plan

Date: 2026-05-16

## Summary

Phase 2 should not restart the product from the original roadmap. The current app already has a working Phase 1 loop plus early threaded comments and voting, so Phase 2 should harden the foundation, make discussion reliable, add notification and privacy surfaces, and turn the existing manual smoke paths into repeatable tests.

Recommended Phase 2 theme:

> Make CritiCool dependable as a private social review app: sessions stay valid, deleted content behaves correctly, comments feel real, friends get notified, and privacy rules are tested end to end.

## Phase 2 Priorities

### 1. Close Phase 1 Correctness Gaps

These items should happen before larger feature work because they affect trust and reliability.

- Replace the review uniqueness rule with "one active review per user/movie."
  - Add a migration for a partial unique index on `(user_id, movie_id) where deleted_at is null`.
  - Remove or adjust the Prisma schema unique constraint that treats soft-deleted reviews as active.
  - Add tests proving users can create a new review after deleting the old one.
- Implement mobile session refresh.
  - Add `/auth/refresh` support to the mobile API client.
  - Retry authenticated requests once after refreshing access tokens.
  - Persist rotated refresh tokens.
  - Sign out only when refresh fails.
- Implement server-side logout from mobile.
  - Call `/auth/logout` before clearing local tokens.
  - Clear local state even if logout fails.
- Normalize visible comment counts.
  - Feed and detail should count only non-deleted comments.
  - Keep this behavior consistent for future notifications and profile stats.
- Add repeatable QA seed/smoke tooling.
  - Script disposable users, friendship, movie import, review creation, comment creation, vote, and feed visibility checks.

### 2. Discussion Hardening

Comments and votes already exist, so Phase 2 should make them feel production-ready.

- Add comment edit and soft-delete endpoints.
- Add vote removal or toggle behavior.
- Keep vote writes idempotent.
- Enforce the existing reply depth limit in API tests and mobile UI.
- Add comment sorting options on review detail:
  - `best`
  - `new`
- Improve deleted-comment presentation.
  - Preserve thread shape where useful.
  - Hide deleted body and author-sensitive content.
- Add mobile states for:
  - posting comment
  - failed comment post
  - failed vote
  - empty comments
  - deleted comments

### 3. Notifications

Add the minimum notification system needed for a social feedback loop.

- Add `notifications` table and API endpoints:
  - `GET /notifications`
  - `POST /notifications/:id/read`
  - `POST /notifications/read-all`
- Create notification events for:
  - friend request received
  - friend request accepted
  - review commented
  - comment replied
  - comment voted
- Add a mobile notifications tab or screen behind the existing tab slot.
- Show unread state and allow marking notifications read.
- Keep notification payloads denormalized enough for mobile display, but avoid storing review/comment body text in notification metadata.

### 4. Profiles, Friends, And Privacy Polish

Make the private social graph easier to understand and safer to use.

- Expand profile screen:
  - user summary
  - recent reviews
  - friend count
  - basic review stats
- Improve friend discovery:
  - clearer pending, incoming, accepted, and declined states
  - better empty states for no friends and no search results
- Add block endpoints and mobile UI:
  - `POST /users/:id/block`
  - `DELETE /users/:id/block`
  - blocked users disappear from search, feed, reviews, comments, and friend flows
- Add report endpoints and minimum mobile UI:
  - report review
  - report comment
  - report user
- Add tests for blocked users across reviews, feed, comments, user search, and friend requests.

### 5. Movie And Review Creation Polish

Improve the core creation path without expanding beyond movies yet.

- Add movie detail screen or modal:
  - poster/backdrop
  - title and year
  - overview
  - friends' reviews
  - review CTA
- Improve create-review validation and editing:
  - clearer duplicate-review handling
  - edit existing review path
  - delete confirmation
  - spoiler preview behavior
- Keep review tags, but treat them as app-owned metadata:
  - validate allowed tag list server-side or document that custom tags are allowed
  - keep the maximum of 5 tags
- Improve microphone dictation behavior where practical:
  - keep browser speech recognition for web
  - document native limitation until a custom development build is added
  - store only final text

## API And Data Changes

Expected schema additions:

- `notifications`
- `reports`
- optional indexes for comment sorting and unread notifications
- partial unique index for active reviews

Expected API additions:

- `PATCH /reviews/:id/comments/:commentId`
- `DELETE /reviews/:id/comments/:commentId`
- `DELETE /reviews/:id/comments/:commentId/votes`
- `GET /notifications`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`
- `POST /users/:id/block`
- `DELETE /users/:id/block`
- `POST /reports`

Expected mobile API client additions:

- refresh token flow
- logout call
- comment edit/delete
- vote remove
- notifications
- block/report actions

## Testing Plan

Backend integration tests should cover:

- auth register, login, refresh, logout, duplicate email, duplicate username
- movie import/upsert normalization
- review create, update, soft delete, recreate after soft delete
- one active review per user/movie
- friend request create, accept, decline, duplicate request, self-request rejection
- feed visibility for self, friend, stranger, blocked user, deleted review
- review detail visibility for self, friend, stranger, blocked user
- comment create, reply depth, edit, delete, sorting, visible count
- comment vote create, update, remove, idempotency
- notification creation and read state
- report creation

Mobile smoke tests should cover:

- welcome, signup, login, logout
- expired access token refresh path
- movie search and review creation
- feed empty and populated states
- tapping feed card into review detail
- comment create, reply, vote, and delete state
- incoming friend request and accepted friend visibility
- notification unread/read flow
- block/report entry points

Manual QA script should create:

- User A, User B, User C
- A review by User A
- accepted friendship between User A and User B
- no friendship for User C
- comments and votes on User A's review
- assertions that User B can see the review and User C cannot

## Milestones

### Milestone 1: Phase 1 Hardening

Ship the correctness fixes, mobile refresh/logout, comment count normalization, and API integration test foundation.

Exit criteria:

- Phase 1 audit gaps are closed or explicitly deferred.
- Repeatable API smoke script exists.
- Core auth/review/feed visibility tests pass.

### Milestone 2: Discussion Reliability

Ship comment edit/delete, vote removal, sorting, deleted-comment display, and mobile failure states.

Exit criteria:

- A review detail can support a real threaded discussion.
- Comment and vote behavior is covered by tests.
- Deleted comments do not inflate visible counts.

### Milestone 3: Notifications And Social Loop

Ship notification storage, notification endpoints, unread/read UI, and events for friend and comment activity.

Exit criteria:

- Users can see when friends accept requests or interact with reviews/comments.
- Notification tests cover creation and read state.

### Milestone 4: Privacy And Profile Polish

Ship richer profiles, block/report UI, and stronger blocked-user privacy tests.

Exit criteria:

- Users understand their own profile and friend state.
- Blocked users are consistently hidden across API and mobile surfaces.
- Report actions create reviewable records.

## Acceptance Criteria

Phase 2 is complete when:

- Phase 1 is fully green against the audit's Definition of Done delta.
- Review detail supports threaded comments with edit/delete, vote/toggle/remove, sorting, and consistent counts.
- Notifications exist for friend requests, accepted requests, comments, replies, and votes.
- Profiles show useful review/friend context.
- Block and report flows exist in API and mobile.
- Backend integration tests cover the full privacy matrix.
- Mobile smoke tests cover signup, auth refresh, review creation, feed, review detail, comments, notifications, and block/report entry points.

## Deferred Until Later

Keep these out of Phase 2 unless priorities change:

- Global explore feed.
- Public profiles.
- Recommendation algorithms.
- Watchlist.
- Contact import.
- Push notifications.
- Admin moderation dashboard.
- Multi-category reviews beyond movies.
- Backend speech-to-text storage or audio upload.
