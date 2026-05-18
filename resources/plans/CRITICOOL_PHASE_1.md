# CritiCool Phase 1

Date: 2026-05-15

Phase 1 should prove the core CritiCool loop end to end:

> A user can create an account, find a movie, write a review, and see friends' reviews in a feed.

This phase should not try to build the whole social network. It should create the technical foundation and one working product path that can be tested on a phone.

## Phase 1 Goal

Build a runnable MVP skeleton with:

- Mobile app shell.
- API service.
- Database schema.
- Auth.
- TMDB movie search.
- Local movie cache.
- Review creation.
- Basic friend relationship support.
- Friends-only feed.
- Review detail placeholder.

## Recommended Starting Approach

Start backend-first, but not backend-only.

The best order is:

1. Scaffold the monorepo.
2. Create the API and database foundation.
3. Add mobile app shell early.
4. Wire one vertical flow from mobile to API.
5. Iterate on UI after data is real.

Do not spend Phase 1 polishing visual design before the data flow works. The risk in this app is not whether the cards can look good; the risk is whether identity, movie cache, reviews, friendship visibility, and feed permissions work cleanly together.

## Subtask 1: Project Scaffold And Local Dev Setup

### Objective

Create the basic repository structure and make the project runnable locally.

### Scope

- Create monorepo structure:

```text
apps/
  api/
  mobile/
packages/
  shared/
resources/
```

- Add root README.
- Add `.env.example` files.
- Configure TypeScript.
- Configure linting/formatting.
- Add package scripts for common workflows.
- Add Docker Compose for PostgreSQL and Redis.

### Deliverables

- `apps/api` starts successfully.
- `apps/mobile` starts successfully.
- PostgreSQL runs locally.
- Redis runs locally, even if jobs are not fully used yet.
- README explains setup.

### Acceptance Criteria

- A developer can clone the repo, create env files, run dependencies, and start API/mobile from documented commands.
- No secrets are committed.
- API exposes `GET /health`.
- Mobile app shows a simple welcome/login placeholder screen.

## Subtask 2: Database Schema And Auth Foundation

### Objective

Create the identity foundation for the app.

### Scope

- Add Prisma.
- Create initial migrations for:
  - `users`
  - `auth_accounts`
  - `sessions`
  - `friendships`
  - `blocks`
- Implement auth endpoints:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /me`
- Add password hashing.
- Add access tokens and refresh token rotation.
- Add basic auth guard/middleware.

### Deliverables

- User can register.
- User can login.
- User can refresh session.
- API can identify current user.

### Acceptance Criteria

- Duplicate emails are rejected.
- Duplicate usernames are rejected.
- Passwords are hashed, never stored directly.
- Refresh tokens are stored hashed.
- `GET /me` returns the logged-in user and rejects anonymous users.
- Basic backend tests cover register, login, refresh, and duplicate handling.

## Subtask 3: TMDB Movie Search And Local Movie Cache

### Objective

Allow users to search for movies and store selected movie metadata locally.

### Scope

- Add TMDB API client.
- Add env var:

```text
TMDB_ACCESS_TOKEN=
```

- Create movie tables:
  - `movies`
  - `movie_genres`
  - `movie_genre_links`
- Implement endpoints:
  - `GET /movies/search?q=`
  - `GET /movies/:id`
  - `POST /movies/tmdb/:tmdbId/import`
- Search behavior:
  - Search local DB first.
  - Call TMDB search when needed.
  - Normalize TMDB results into API response shape.
  - Import/upsert selected movie before review creation.

### Deliverables

- Mobile can search movies.
- API can import a TMDB movie into local DB.
- Movie detail can be read from local DB.

### Acceptance Criteria

- TMDB key is read from env only.
- Search handles empty query, no results, and TMDB failure.
- Imported movies are upserted by `tmdb_id`.
- API returns usable poster/backdrop URLs or enough path/config data for the client to render images.
- Basic tests cover movie upsert normalization.

## Subtask 4: Reviews API And Create Review UI

### Objective

Let a logged-in user create their first movie review.

### Scope

- Create review tables:
  - `reviews`
  - `review_revisions`, optional in Phase 1 if time allows.
- Implement endpoints:
  - `POST /reviews`
  - `GET /reviews/:id`
  - `PATCH /reviews/:id`
  - `DELETE /reviews/:id`
- Add mobile create-review flow:
  - Search/select movie.
  - Pick rating.
  - Add quick take.
  - Add full review body.
  - Toggle spoilers.
  - Publish.

### Deliverables

- User can create a review for a selected movie.
- User can view the created review detail.
- User can edit/delete their own review from API, even if mobile edit UI is minimal.

### Acceptance Criteria

- Rating is required and must be between 0 and 5.
- One user can have only one active review per movie.
- Users cannot edit or delete another user's review.
- Deleted reviews are soft-deleted.
- Create review from mobile calls real API, not mock data.

## Subtask 5: Friendships And Feed Visibility

### Objective

Implement the minimum social graph needed for a friends-only feed.

### Scope

- Implement endpoints:
  - `GET /users/search?q=`
  - `POST /friend-requests`
  - `GET /friend-requests/incoming`
  - `GET /friend-requests/outgoing`
  - `POST /friend-requests/:id/accept`
  - `POST /friend-requests/:id/decline`
  - `GET /friends`
- Implement visibility helper:
  - self can see own reviews.
  - accepted friends can see reviews.
  - strangers cannot see friends-only reviews.
  - blocked users cannot see each other.

### Deliverables

- User can search another user by username.
- User can send a friend request.
- User can accept a friend request.
- Accepted friends can see each other's reviews.

### Acceptance Criteria

- Duplicate pending requests are rejected or returned idempotently.
- A user cannot friend themselves.
- Blocked users do not appear in search results.
- Visibility logic is tested directly.

## Subtask 6: Friends-only Feed

### Objective

Build the first real feed.

### Scope

- Implement endpoint:
  - `GET /feed?cursor=`
- Feed returns:
  - review ID.
  - author summary.
  - movie summary.
  - rating.
  - quick take.
  - spoiler flag.
  - comment count, initially `0`.
  - created timestamp.
- Add mobile feed screen:
  - empty state.
  - populated state.
  - pull to refresh.
  - cursor pagination.
  - tap review card to open detail.

### Deliverables

- A user sees accepted friends' reviews in feed.
- A user does not see strangers' reviews.
- A user sees their own reviews either in feed or profile, depending on product decision.

### Acceptance Criteria

- Feed excludes deleted reviews.
- Feed is ordered newest first.
- Feed uses cursor pagination, not offset pagination.
- Feed query is covered by tests for friend, stranger, blocked user, and deleted review cases.

## Subtask 7: Review Detail Placeholder And Comments Prep

### Objective

Create the page structure for the future Reddit-style discussion without fully building comments yet.

### Scope

- Mobile review detail screen:
  - author.
  - movie.
  - rating.
  - quick take.
  - full review.
  - spoiler handling.
  - placeholder comments section.
- API response should include enough data for detail rendering.
- Optionally create comments schema now if it does not slow Phase 1.

### Deliverables

- Tapping a feed item opens review detail.
- Full review body is only visible on detail.
- Comment area shows an empty state like "Comments coming next" or a disabled composer.

### Acceptance Criteria

- Review detail respects the same visibility rules as feed.
- Spoiler reviews require explicit reveal before body is shown.
- Screen handles deleted or inaccessible review gracefully.

## Phase 1 Definition Of Done

Phase 1 is complete when:

- API and mobile app run locally from README instructions.
- A new user can register and login.
- A user can search TMDB movies.
- A user can create a review for a movie.
- A second user can become friends with the first user.
- The second user can see the first user's review in the feed after friendship is accepted.
- A stranger cannot see that review.
- Feed card opens review detail.
- Basic backend tests cover auth, movie import, review creation, and visibility.

## What To Delay Until Phase 2

Delay these intentionally:

- Full threaded comments.
- Comment votes.
- Voice transcription.
- Notifications.
- TMDB scheduled jobs.
- Profile polish.
- Push notifications.
- Admin/moderation dashboard.
- Watchlist.
- Public profiles.

These are important, but they should come after the core loop is real.

## Suggested Phase 2

Phase 2 should add:

- Threaded comments.
- Upvote/downvote on comments.
- Notification events.
- Microphone transcription.
- TMDB daily sync jobs.
- Better profile pages.
- Report/block UI polish.

