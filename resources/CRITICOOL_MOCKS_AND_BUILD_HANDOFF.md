# CritiCool Mocks And Build Handoff

Date: 2026-05-15

This document turns the product plan into an implementation-ready handoff. The goal is to let another agent start building the MVP without needing to reinterpret the product direction.

## 1. Build Decision

Use this stack unless there is a strong reason not to:

- Mobile: React Native with Expo and TypeScript.
- API: NestJS with TypeScript.
- Database: PostgreSQL.
- ORM: Prisma.
- Jobs: BullMQ with Redis.
- Auth: custom email/password JWT with refresh token rotation for MVP.
- Storage: S3-compatible storage later; local placeholder for avatars in first pass.
- Movie data: TMDB API, cached locally.

Start with a monorepo:

```text
CritiCool/
  apps/
    mobile/
    api/
  packages/
    shared/
  resources/
```

## 2. MVP Build Order

Build in this order:

1. Repo scaffold and shared TypeScript setup.
2. API health check, database connection, Prisma schema.
3. Auth: register, login, refresh, logout, current user.
4. User profile and username flow.
5. TMDB movie search and local movie cache.
6. Review creation.
7. Friend requests and friends-only visibility.
8. Feed endpoint and mobile feed UI.
9. Review detail page.
10. Comments and comment votes.
11. Voice transcription UI state.
12. TMDB daily sync jobs.

Do not build global discovery, public feeds, recommendation logic, or multi-category review subjects in the first pass.

## 3. Visual Language

CritiCool should feel like a social movie app, not a database.

Use:

- Movie posters and backdrops as the main visual asset.
- A clean neutral shell.
- Bright accents only for actions and ratings.
- Compact review cards that are easy to scan.
- A subtle film-strip motif from the brainstorming sketches, used sparingly.

Avoid:

- A marketing landing page as the first screen.
- Heavy decorative card nesting.
- A global public feed.
- Showing the full review body directly in the feed.

## 4. Core Mobile Mocks

### 4.1 Logged-out Welcome

Purpose: get the user into auth quickly.

```text
┌──────────────────────────────┐
│                              │
│        CritiCool             │
│  Your friends' movie takes.  │
│                              │
│  [ Create account ]          │
│  [ Log in ]                  │
│                              │
│  Movie art background        │
│  or subtle film-strip motif  │
│                              │
└──────────────────────────────┘
```

Acceptance:

- Primary CTA is create account.
- Login is secondary.
- No feed preview before auth for MVP.

### 4.2 Signup

```text
┌──────────────────────────────┐
│ Create account               │
├──────────────────────────────┤
│ Email                        │
│ [                         ]  │
│ Password                     │
│ [                         ]  │
│ Username                     │
│ [                         ]  │
│ Display name                 │
│ [                         ]  │
│                              │
│ [ Continue ]                 │
└──────────────────────────────┘
```

Acceptance:

- Validate username availability.
- Validate email format.
- Show password errors inline.

### 4.3 Empty Feed

```text
┌──────────────────────────────┐
│ CritiCool              🔍  + │
├──────────────────────────────┤
│                              │
│ No friend reviews yet.       │
│                              │
│ [ Find friends ]             │
│ [ Review a movie ]           │
│                              │
│ Upcoming movies              │
│ [Poster] [Poster] [Poster]   │
└──────────────────────────────┘
```

Acceptance:

- Empty state gives two useful actions.
- Upcoming movies can be shown from cached TMDB data.

### 4.4 Populated Feed

```text
┌──────────────────────────────┐
│ CritiCool              🔍  + │
├──────────────────────────────┤
│ @mari                        │
│ reviewed                     │
│                              │
│ ┌──────────────────────────┐ │
│ │ Movie backdrop/poster    │ │
│ │                          │ │
│ │ Dune: Part Two      2024 │ │
│ │ ★★★★½                   │ │
│ │ "Huge, strange,          │ │
│ │ beautiful."              │ │
│ │ 12 comments       2h ago │ │
│ └──────────────────────────┘ │
│                              │
│ @leo                         │
│ ┌──────────────────────────┐ │
│ │ Challengers         2024 │ │
│ │ ★★★★☆                   │ │
│ │ Spoiler-free             │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

Acceptance:

- Full review body is not visible.
- Tapping a card opens review detail.
- Pull to refresh.
- Infinite scroll with cursor pagination.

### 4.5 Feed Card Component

Required data:

- Review ID.
- Author avatar, display name, username.
- Movie title.
- Release year.
- Poster/backdrop URL.
- Rating.
- Quick take.
- Spoiler flag.
- Comment count.
- Created timestamp.

States:

- Normal.
- Spoiler review.
- Deleted movie art fallback.
- Loading skeleton.

### 4.6 Search Movies

```text
┌──────────────────────────────┐
│ Search                       │
├──────────────────────────────┤
│ [ dune                    ]  │
│                              │
│ Results                      │
│ [Poster] Dune: Part Two      │
│          2024                │
│          Denis Villeneuve    │
│                              │
│ [Poster] Dune                │
│          2021                │
│                              │
│ Upcoming                     │
│ [Poster] [Poster] [Poster]   │
└──────────────────────────────┘
```

Acceptance:

- Debounced search.
- Uses local DB first, then TMDB.
- Selecting a movie opens movie detail.

### 4.7 Movie Detail

```text
┌──────────────────────────────┐
│ ← Movie                      │
├──────────────────────────────┤
│ [Backdrop image]             │
│ [Poster] Dune: Part Two      │
│          2024 · 166 min      │
│          Sci-Fi · Adventure  │
│                              │
│ Your friends                 │
│ ★★★★½ average from 4 reviews │
│                              │
│ [ Review this movie ]        │
│                              │
│ Friend reviews               │
│ @mari ★★★★½ "Huge..."       │
│ @leo  ★★★★☆ "Epic..."       │
└──────────────────────────────┘
```

Acceptance:

- Shows TMDB metadata from local cache.
- Review CTA is visible.
- Friend reviews only.

### 4.8 Create Review: Movie Selected

```text
┌──────────────────────────────┐
│ New Review             Post  │
├──────────────────────────────┤
│ [Poster] The Matrix          │
│          1999                │
│                              │
│ Rating                       │
│ ☆ ☆ ☆ ☆ ☆                    │
│                              │
│ Quick take                   │
│ [ Still feels impossible. ]  │
│                              │
│ Full review                  │
│ ┌──────────────────────────┐ │
│ │ Type or dictate...    🎙 │ │
│ └──────────────────────────┘ │
│                              │
│ [ ] Contains spoilers        │
└──────────────────────────────┘
```

Acceptance:

- Post disabled until movie and rating exist.
- Body can be empty, quick take can be empty, but at least one text field should be recommended.
- One user can only have one active review per movie.

### 4.9 Voice Recording State

```text
┌──────────────────────────────┐
│ Full review                  │
│ ┌──────────────────────────┐ │
│ │ Live transcript appears  │ │
│ │ here as the user speaks. │ │
│ └──────────────────────────┘ │
│                              │
│ ● Recording 00:18            │
│ [ Pause ] [ Stop ] [Discard] │
└──────────────────────────────┘
```

Acceptance:

- User can deny microphone permission without breaking review creation.
- Transcript remains editable.
- Raw audio is not stored in MVP.

### 4.10 Review Detail

```text
┌──────────────────────────────┐
│ ← Review                ⋯    │
├──────────────────────────────┤
│ @mari reviewed               │
│ Dune: Part Two               │
│ ★★★★½                        │
│                              │
│ Huge, strange, beautiful.    │
│                              │
│ Full review text goes here.  │
│ It can be multiple           │
│ paragraphs.                  │
│                              │
├──────────────────────────────┤
│ Comments              Best ▾ │
│ ▲ 18 ▼ @ana                 │
│ This is exactly how I felt.  │
│ Reply                        │
│                              │
│   ▲ 6 ▼ @joao               │
│   The sound design carried.  │
│   Reply                      │
│                              │
│ [ Add a comment...        ]  │
└──────────────────────────────┘
```

Acceptance:

- Threaded comments render to depth 3.
- Comments can be sorted by best or new.
- Upvote/downvote is per user and idempotent.

### 4.11 Friend Search

```text
┌──────────────────────────────┐
│ Find Friends                 │
├──────────────────────────────┤
│ [ search username         ]  │
│                              │
│ @ana                         │
│ Ana Silva              Add   │
│                              │
│ @leo                         │
│ Leo Martins            Add   │
└──────────────────────────────┘
```

Acceptance:

- Cannot send duplicate pending requests.
- Blocked users are not shown.
- Existing friends show as Friends, not Add.

### 4.12 Notifications

```text
┌──────────────────────────────┐
│ Notifications                │
├──────────────────────────────┤
│ @ana sent you a friend       │
│ request.     Accept Decline  │
│                              │
│ @leo replied to your comment │
│ on The Matrix.              │
└──────────────────────────────┘
```

Acceptance:

- Friend requests can be accepted/declined inline.
- Tapping comment notification opens review detail at the thread.

### 4.13 Profile

```text
┌──────────────────────────────┐
│ @mari                   ⚙    │
├──────────────────────────────┤
│ [Avatar] Mari                │
│ 42 reviews · 31 friends      │
│                              │
│ Recent reviews               │
│ [Poster] Dune: Part Two ★★★★½│
│ [Poster] Challengers   ★★★★☆ │
└──────────────────────────────┘
```

Acceptance:

- Own profile has settings button.
- Friend profile has friend/unfriend controls.
- Stranger profile hides reviews in MVP.

## 5. API Acceptance Criteria

### Auth

- Register creates `users`, `auth_accounts`, and `sessions`.
- Login returns access token and refresh token.
- Refresh rotates refresh token.
- Logout revokes current session.

### Movies

- Search uses TMDB when local results are weak.
- Selecting a TMDB result upserts the movie locally.
- API responses return full image URLs, not only TMDB paths.

### Reviews

- A user can create, edit, and soft-delete their own review.
- A user cannot edit another user's review.
- A user cannot view a non-friend's friends-only review.
- Blocked relationships hide reviews both ways.

### Feed

- Feed only returns accepted friends' reviews.
- Feed excludes deleted reviews.
- Feed uses cursor pagination.

### Comments

- Comments inherit review visibility.
- Comment depth is capped at 3.
- Vote updates replace the user's previous vote.
- Score is updated consistently.

## 6. First Sprint Deliverable

The first implementation sprint should produce:

- A running API service.
- A running Expo mobile app.
- PostgreSQL migrations.
- Register/login/current user.
- Movie search against TMDB.
- Local movie upsert.
- Create review API.
- A static-but-wired mobile feed screen using API data.

Definition of done:

- Another developer can run the app locally from README instructions.
- Environment variables are documented.
- At least basic backend tests exist for auth and review visibility.
- No TMDB API key is committed.

## 7. Environment Variables

API:

```text
DATABASE_URL=
REDIS_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
TMDB_ACCESS_TOKEN=
TMDB_DEFAULT_LANGUAGE=en-US
TMDB_DEFAULT_REGION=US
```

Mobile:

```text
EXPO_PUBLIC_API_URL=
```

## 8. Handoff Prompt For Another Agent

Use this prompt to start implementation:

```text
Build the CritiCool MVP from the planning docs in resources/.

Read:
- resources/CRITICOOL_PRODUCT_PLAN.md
- resources/CRITICOOL_MOCKS_AND_BUILD_HANDOFF.md

Use the recommended stack unless blocked:
- Expo React Native mobile app
- NestJS TypeScript API
- PostgreSQL
- Prisma
- Redis/BullMQ for later jobs

Start by scaffolding a monorepo with apps/mobile, apps/api, and packages/shared.

First deliverable:
- API health endpoint
- Prisma schema/migration for users, auth_accounts, sessions, movies, reviews, friendships, comments, comment_votes
- auth register/login/refresh/me
- TMDB movie search and local movie upsert
- create review endpoint
- friends-only feed endpoint, even if friendship UI is minimal
- Expo app with login, feed, search movie, create review, and review detail placeholder

Do not build public feeds, recommendations, or non-movie categories yet.
Document setup in README and keep secrets out of git.
```

