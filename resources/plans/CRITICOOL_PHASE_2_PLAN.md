# CritiCool Phase 2 Plan

Date: 2026-05-18

## Summary

Phase 2 has not started yet. The current codebase has a strong Phase 1 implementation and also includes some Phase 2-adjacent discussion work earlier than planned, but Phase 1 is not fully complete against its own acceptance criteria.

Recommended Phase 2 theme:

> Finish the Phase 1 contract, then make CritiCool dependable as a private social review app: sessions stay valid, deleted content behaves correctly, comments feel real, friends get notified, and privacy rules are tested end to end.

## Phase 1 Audit

### Completed Or Largely Complete

- Monorepo structure exists with `apps/api`, `apps/mobile`, `packages/shared`, and `resources`.
- Local infrastructure exists through Docker Compose for PostgreSQL and Redis.
- API foundation exists with NestJS, Prisma, health check, auth guard, and environment examples.
- Mobile app shell exists with welcome/auth, feed, search, post, friends, and profile areas.
- Auth API exists for register, login, refresh, logout, and `GET /me`.
- Passwords and refresh tokens are hashed server-side.
- Movie search/import exists with local DB search, TMDB fallback, and local movie upsert.
- Review API exists for create, read, update, and soft delete.
- Review revisions were implemented earlier than required.
- User search, friend request, incoming/outgoing requests, accept/decline, and friend list exist.
- Feed API and mobile feed exist with cursor pagination, empty state, pull-to-refresh, and review-detail navigation.
- Review detail exists and already includes threaded comments, comment creation, replies, and comment voting.
- Spoiler reveal behavior exists on review detail.

### Partially Complete

- Mobile auth persists tokens, but it does not call `/auth/refresh`, retry expired access tokens, or call `/auth/logout` before clearing local state.
- Review uniqueness is still a full unique constraint on `(user_id, movie_id)`, so a user cannot create a replacement review after soft-deleting the old one.
- Backend tests exist for direct visibility rules, personal feed controller wiring, and comment vote service behavior, but they do not cover the Phase 1 Definition of Done broadly.
- Feed visibility is implemented, including accepted friends and block filtering, but the feed test coverage does not yet prove friend, stranger, blocked user, and deleted review cases.
- Review detail visibility is implemented through the shared visibility helper, but there are no integration tests for self, friend, stranger, blocked, deleted, and inaccessible cases.
- Feed and review detail count only non-deleted comments in the included comment list, but feed `commentCount` uses Prisma `_count.comments`, which will include soft-deleted comments once comment deletion is added.
- The mobile create-review flow calls the real API, but mobile edit/delete review flows are not present.
- Blocks are represented in the schema and visibility/search logic, but there are no block API endpoints or mobile block UI.

### Not Complete Against Phase 1 Acceptance

- Basic backend tests do not yet cover auth register/login/refresh/duplicates, movie upsert normalization, review creation/update/delete, or full feed visibility.
- Repeatable end-to-end QA tooling does not exist for disposable users, friendship, movie import, review creation, feed visibility, comments, and votes.
- There is no server-side or mobile flow verification showing the full Phase 1 loop from fresh signup through accepted friendship and friends-only feed on a running app.

## Phase 2 Priorities

### 1. Finish Phase 1 Acceptance Criteria

These items should happen before larger feature work because they close gaps in the original MVP contract.

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
  - Avoid raw `_count.comments` for user-visible counts when soft deletes are involved.
- Add focused backend integration tests for Phase 1:
  - auth register, login, refresh, logout, duplicate email, duplicate username
  - movie search/import/upsert normalization
  - review create, update, soft delete, recreate after soft delete
  - friend request create, accept, decline, duplicate request, self-request rejection
  - feed visibility for self, friend, stranger, blocked user, and deleted review
  - review detail visibility for self, friend, stranger, blocked user, and deleted review
- Add repeatable QA seed/smoke tooling.
  - Script disposable users, friendship, movie import, review creation, comment creation, vote, and feed visibility checks.
  - Document which commands prove the Phase 1 Definition of Done.

### 2. Discussion Reliability

Comments and votes already exist, so Phase 2 should harden them instead of starting from scratch.

- Add comment edit and soft-delete endpoints.
- Add explicit vote removal endpoint or keep the current two-step toggle behavior and document it as product behavior.
- Keep vote writes idempotent and covered by tests.
- Enforce the reply depth limit in API tests and mobile UI.
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
- Add tests for:
  - comment create
  - nested replies
  - depth cap
  - edit
  - soft delete
  - sorting
  - visible count
  - voting idempotency and removal/toggle behavior

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
- Add a mobile notifications tab or screen behind a navigation slot.
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

Expected API additions or changes:

- `PATCH /reviews/:id/comments/:commentId`
- `DELETE /reviews/:id/comments/:commentId`
- `DELETE /reviews/:id/comments/:commentId/votes` or documented equivalent toggle semantics
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
- vote remove or documented two-step toggle handling
- notifications
- block/report actions

## Testing Plan

Backend integration tests should cover:

- auth register, login, refresh, logout, duplicate email, duplicate username
- movie import/upsert normalization and TMDB failure fallback behavior
- review create, update, soft delete, recreate after soft delete
- one active review per user/movie
- friend request create, accept, decline, duplicate request, self-request rejection
- feed visibility for self, friend, stranger, blocked user, deleted review
- review detail visibility for self, friend, stranger, blocked user
- comment create, reply depth, edit, delete, sorting, visible count
- comment vote create, update, remove/toggle, idempotency
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
- a review by User A
- accepted friendship between User A and User B
- no friendship for User C
- comments and votes on User A's review
- assertions that User B can see the review and User C cannot
- a deleted review and deleted comment to verify they are hidden from visible counts and feeds

## Milestones

### Milestone 1: Finish Phase 1

Ship the correctness fixes, mobile refresh/logout, comment count normalization, and Phase 1 integration tests.

Exit criteria:

- Phase 1 audit gaps are closed or explicitly deferred with owner and reason.
- Repeatable API smoke script exists.
- Core auth, movie, review, friendship, feed, and visibility tests pass.
- The documented manual QA path proves signup, movie search, review creation, accepted friendship, friends-only feed, stranger exclusion, and review detail.

### Milestone 2: Discussion Reliability

Ship comment edit/delete, vote removal or documented toggle behavior, sorting, deleted-comment display, and mobile failure states.

Exit criteria:

- Review detail supports a real threaded discussion.
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

- Phase 1 is fully green against its Definition of Done, including repeatable tests or smoke scripts.
- Review detail supports threaded comments with edit/delete, vote/toggle/remove behavior, sorting, and consistent counts.
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
