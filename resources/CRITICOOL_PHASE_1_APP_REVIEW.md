# CritiCool Phase 1 App Review

Date: 2026-05-16

## Verdict

CritiCool is mostly functional end to end for the Phase 1 core loop: a user can sign up, search/import a TMDB movie, create a review, become friends with another user, and have that friend see the review in the feed while strangers cannot.

Phase 1 is not fully complete against its own acceptance criteria. The main gaps are test coverage, session lifecycle handling in the mobile app, soft-delete uniqueness behavior, and a few reliability/polish issues that should be fixed before calling Phase 1 done.

## Verified Checks

Automated checks:

- `npm test` passed.
- `npm run build` passed for API, mobile, and shared workspaces.
- `npm run lint` passed for the API workspace.

Live API smoke test:

- Registered three disposable users.
- Verified authenticated `/me`.
- Searched TMDB-backed movie results.
- Imported `The Matrix` into the local movie cache.
- Created a review with rating, quick take, body, and tags.
- Confirmed a stranger receives `404` for the review before friendship.
- Sent and accepted a friend request.
- Confirmed the friend feed includes the review.
- Confirmed the stranger feed excludes the review.
- Created a comment and voted it to score `1`.

Expo web smoke test:

- Loaded the welcome screen at `http://localhost:8081`.
- Created a disposable account through the UI.
- Reached the empty feed state.
- Searched for `matrix`.
- Selected `The Matrix`.
- Created a review from the UI.
- Landed on review detail with the posted review text.

Runtime notes:

- Docker PostgreSQL and Redis were healthy during review.
- API health responded at `http://localhost:3000/health`.
- Expo web rendered successfully from the existing Metro session.
- Browser console showed React Native Web deprecation warnings for `shadow*` style props and `pointerEvents`.

## Phase 1 Checklist

| Phase 1 area | Status | Notes |
| --- | --- | --- |
| Project scaffold and local dev setup | Complete | Monorepo structure, README, Docker Compose, health endpoint, and app shell are present. |
| Database schema and auth foundation | Partial | Schema and endpoints exist, password and refresh tokens are hashed, but automated auth coverage is missing and mobile does not refresh access tokens. |
| TMDB movie search and local movie cache | Partial | Live search/import works with `TMDB_ACCESS_TOKEN`; tests for upsert normalization, empty query, no results, and TMDB failure are missing. |
| Reviews API and create review UI | Partial | Create, detail, edit, delete API, revisions, and mobile create flow exist. Soft-deleted reviews still block future reviews for the same user/movie. |
| Friendships and feed visibility | Partial | Friend request flow and visibility helper exist and worked in live smoke testing. Direct visibility tests exist, but API-level friend/stranger/blocked coverage is incomplete. |
| Friends-only feed | Partial | Feed endpoint, cursor pagination, pull refresh, mobile feed, and visibility behavior are present. Feed coverage is not broad enough for Phase 1 acceptance. |
| Review detail placeholder and comments prep | Complete for Phase 1 intent | Detail screen exists and comments are already beyond placeholder with threaded comments and votes. Spoiler reveal is implemented on detail. |

## Code Review Notes

### Soft-deleted reviews block replacement reviews

`apps/api/prisma/schema.prisma` uses `@@unique([userId, movieId])` on `Review`. Because deletes are soft deletes, a deleted review still occupies the unique key and prevents the user from creating a new active review for that movie. Phase 1 requires one active review per user/movie, not one lifetime review.

Recommended fix: replace the Prisma-level unique behavior with a database partial unique index on `(user_id, movie_id) where deleted_at is null`, and update Prisma/migrations accordingly.

### Mobile stores refresh tokens but never refreshes

`apps/mobile/src/api.ts` exposes login/register and stores both access and refresh tokens, but the API client does not call `/auth/refresh` when an access token expires. Access tokens are intentionally short lived in `AuthService`, so mobile users will eventually hit unauthorized states even with a valid refresh token.

Recommended fix: add refresh handling around authenticated API requests, persist rotated tokens, and sign the user out only if refresh fails.

### Mobile sign-out does not revoke server sessions

`App.tsx` clears local token state on sign-out, but it does not call `/auth/logout`. This leaves the refresh token valid until expiry unless revoked elsewhere.

Recommended fix: call `/auth/logout` with the stored refresh token before clearing local state. If the call fails, still clear local state but log/report the failure in development.

### Deleted comments can affect counts

Review detail presents `commentCount` from loaded non-deleted comments, while feed uses Prisma `_count` on comments without a deleted filter. This can make counts inconsistent once comment deletion exists or deleted rows are introduced.

Recommended fix: normalize comment count semantics everywhere to count only `deletedAt: null` comments, or introduce a maintained visible comment count.

### Backend tests are below Phase 1 acceptance coverage

Current tests cover direct visibility logic only. Phase 1 acceptance asks for auth, duplicate handling, movie upsert normalization, review creation, ownership rules, friendship behavior, feed visibility, blocked users, and deleted review cases.

Recommended fix: add integration tests around API services/controllers using an isolated test database or transaction reset strategy.

### Expo web deprecation warnings

The browser smoke test showed React Native Web warnings for deprecated `shadow*` style props and `props.pointerEvents`. These are not blocking Phase 1 behavior, but they should be cleaned up to reduce noise and future upgrade risk.

Recommended fix: move web-specific shadows to `boxShadow` where needed and prefer `style.pointerEvents`.

## Prioritized Recommendations

1. Fix soft-delete uniqueness for reviews.

   This is the highest-priority correctness issue because it violates the Phase 1 rule of one active review per user/movie and can trap users after deleting a review.

2. Add mobile refresh and logout handling.

   Session lifecycle is part of the auth foundation. Without refresh, valid users can be pushed into broken authenticated states after access token expiry.

3. Add Phase 1 API integration tests.

   Cover register/login/refresh/logout, duplicate email and username, TMDB import/upsert, review create/update/delete ownership, friend request transitions, feed visibility, blocked users, and deleted reviews.

4. Normalize comment counting.

   Decide that visible counts exclude soft-deleted comments and apply that consistently across feed, detail, and future notification surfaces.

5. Add repeatable seed and smoke scripts for manual QA.

   The live smoke path is useful, but it should become a repeatable script that creates disposable users, friendships, movies, reviews, comments, and verifies the feed matrix.

## Definition Of Done Delta

Before Phase 1 is marked complete, the project should have:

- Passing integration tests for the full Phase 1 core loop.
- A review uniqueness model that allows a new review after soft delete.
- Mobile refresh-token rotation wired into the API client.
- Mobile logout revoking the refresh token server-side.
- Feed/detail comment counts using the same visible-comment definition.
- A documented or scripted manual QA path for the friend review feed flow.

## Phase 2 Planning Implication

Because threaded comments and voting already exist ahead of the original Phase 2 outline, Phase 2 should start by hardening discussion, notification, profile, privacy, and test coverage rather than rebuilding comment basics from scratch.
