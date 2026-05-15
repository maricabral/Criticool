# CritiCool Product Plan

Date: 2026-05-15

CritiCool is a private-first social review network. The MVP starts with movies, then expands to TV, games, books, restaurants, products, and other reviewable things. The core product idea is simple: Instagram-speed browsing for reviews, Reddit-depth discussion when you open one.

## 1. Product Positioning

### One-line pitch

CritiCool is a social feed where you only see movie reviews from friends, then jump into threaded discussion when a review deserves a conversation.

### Product principles

- Friends first: the default feed is not global and not algorithmic strangers.
- Review first, essay second: the feed shows the movie, reviewer, rating, and quick reaction. The long review opens only when requested.
- Conversation has structure: review detail pages behave more like Reddit threads than Instagram comment piles.
- Low-friction creation: users can dictate reviews by microphone and edit the transcription.
- External catalog, internal social graph: TMDB supplies movie metadata, CritiCool owns users, friendships, reviews, comments, votes, lists, and activity.

### MVP target user

A person who watches movies and wants to know what friends think before reading public critics, generic ratings, or anonymous reviews.

## 2. MVP Scope

### Must have

- Email/password auth plus OAuth-ready architecture.
- User profiles with avatar, display name, username, bio, favorite genres.
- Friend request flow.
- Friends-only feed.
- Movie search powered by TMDB.
- Movie detail page with poster, backdrop, metadata, friends' ratings, and review CTA.
- Create/edit/delete movie review.
- Rating scale.
- Optional spoiler flag.
- Optional short review summary shown in feed.
- Full review detail page.
- Threaded comments on reviews.
- Upvote/downvote on comments.
- Microphone transcription when writing a review.
- Daily TMDB sync job for upcoming and changed movies.
- Basic notifications.
- Moderation primitives: report review/comment, block user.

### Should have after MVP

- Watchlist.
- "Watched" history.
- Reactions to reviews.
- Comment sorting: best, new, controversial.
- Push notifications.
- Share review outside app.
- Import friends from contacts.
- Public profile toggle.
- TV shows.

### Not for MVP

- Global explore feed.
- Public anonymous comments.
- Recommendation engine.
- Creator monetization.
- Full critic publication workflow.
- Multi-content reviews beyond movies.

## 3. Platform Recommendation

### Recommended stack

- Mobile app: React Native with Expo.
- Web admin/internal tooling: Next.js later, not MVP critical.
- API: NestJS or Fastify with TypeScript.
- Database: PostgreSQL.
- ORM: Prisma or Drizzle.
- Cache/queue: Redis plus BullMQ.
- Object storage: S3-compatible storage for avatars and generated assets.
- Search: PostgreSQL trigram/full-text for MVP, Meilisearch/Typesense later if needed.
- Auth: managed auth if speed matters, custom JWT/session auth if control matters.
- Speech-to-text: device native speech recognition for MVP where possible, cloud fallback for consistency.

### Why this stack

React Native/Expo gets iOS and Android quickly, and TypeScript keeps shared domain types practical. PostgreSQL is the right default because the social graph, votes, comments, and review constraints are relational. Redis is useful for feeds, jobs, rate limits, and notification fanout.

## 4. Core UX

### Main navigation

Bottom tabs:

1. Feed
2. Search
3. Create
4. Notifications
5. Profile

### Feed behavior

The feed is only reviews from accepted friends. Each feed item should be glanceable:

- Friend avatar and username.
- Movie poster/backdrop.
- Movie title and release year.
- Rating.
- One-line reaction or summary.
- Spoiler badge if applicable.
- Comment count.
- Friend activity timestamp.

The full review body is hidden in the feed. Tapping the card opens the review detail page.

### Feed visual direction

The sketches in `resources/brainstorming` suggest a vertical film-strip style. Use that as inspiration, but keep the production UI clean:

- Vertical scroll feed.
- Each review item uses poster/backdrop art as the primary visual signal.
- A subtle film-strip rail can appear as a brand motif, especially in onboarding or empty states.
- Avoid heavy decorative borders around every card. Let movie art carry the feed.
- Rating should be immediately visible, using a CritiCool-specific mark such as a popcorn bucket, ticket, or star.

### Feed wireframe

```text
┌──────────────────────────────┐
│ CritiCool              🔍  + │
├──────────────────────────────┤
│ @mari reviewed               │
│                              │
│ [ Movie backdrop / poster ]  │
│                              │
│ Dune: Part Two        2024   │
│ 4.5 / 5                     │
│ "Huge, strange, beautiful."  │
│ 12 comments       2h ago     │
├──────────────────────────────┤
│ @leo reviewed                │
│ [ Movie art ]                │
│ Challengers           2024   │
│ 4 / 5                       │
│ Spoiler-free                 │
└──────────────────────────────┘
```

### Review detail page

This is where the Reddit influence appears.

Elements:

- Review header with reviewer and movie.
- Rating.
- Full review body.
- Spoiler reveal gate if needed.
- Up/down interaction for comments, not necessarily for the review itself in MVP.
- Threaded comment tree.
- Reply composer.
- Sort comments by best/new.

Wireframe:

```text
┌──────────────────────────────┐
│ ← Review                     │
├──────────────────────────────┤
│ @mari on Dune: Part Two      │
│ 4.5 / 5        Spoiler-free  │
│                              │
│ Full review text...          │
│                              │
├──────────────────────────────┤
│ Comments              Best ▾ │
│ ▲ 18  @ana                  │
│ This is exactly how I felt.  │
│   ▲ 6  @joao                │
│   The sound design carried.  │
│                              │
│ Reply...             Send    │
└──────────────────────────────┘
```

### Create review flow

1. Tap Create.
2. Search movie.
3. Select movie.
4. Rate movie.
5. Add short reaction.
6. Add full review by typing or microphone.
7. Mark spoiler if needed.
8. Preview.
9. Publish.

Microphone UX:

- Show a microphone button inside the review text field.
- When recording, show live transcript, timer, pause, stop, and discard controls.
- After transcription, insert text into the review editor so the user can correct it.
- Store only final text by default. Store audio only if you intentionally add that feature later.

Create wireframe:

```text
┌──────────────────────────────┐
│ New Review             Post  │
├──────────────────────────────┤
│ Movie: Search or selected    │
│ [Poster] The Matrix, 1999    │
│                              │
│ Rating: ★ ★ ★ ★ ☆            │
│ Quick take                   │
│ [Still hits like lightning]  │
│                              │
│ Full review                  │
│ [ text editor...          🎙 ]│
│                              │
│ [ ] Contains spoilers        │
└──────────────────────────────┘
```

## 5. Auth And Identity

### MVP auth

- Email/password signup.
- Email verification.
- Password reset.
- Access token and refresh token.
- Refresh token rotation.
- Device/session table.
- Username uniqueness.

### OAuth-ready design

Add account providers from day one even if only email/password ships:

- `auth_accounts` table stores provider identities.
- `users` table stores app-level profile.
- This makes Google, Apple, and social login easier later.

### Authorization rules

- A review is visible if:
  - the viewer is the author, or
  - the viewer and author are accepted friends, or
  - a future visibility setting allows broader access.
- Comments inherit visibility from the parent review.
- Blocked users cannot see each other's profiles, reviews, comments, or friend requests.

## 6. Data Model

### Entity overview

- `users`: app identity.
- `auth_accounts`: login providers.
- `sessions`: refresh/session tracking.
- `friendships`: social graph.
- `blocks`: user blocks.
- `movies`: local TMDB-backed movie cache.
- `movie_genres`: genre dictionary.
- `movie_genre_links`: movie-to-genre join.
- `reviews`: one user review per movie.
- `review_revisions`: audit/history for edited reviews.
- `comments`: threaded comments under reviews.
- `comment_votes`: up/down votes.
- `review_reactions`: lightweight reactions, optional MVP.
- `notifications`: in-app notifications.
- `reports`: moderation reports.
- `tmdb_sync_runs`: job history.

### PostgreSQL schema draft

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  username citext not null unique,
  display_name text not null,
  email citext not null unique,
  avatar_url text,
  bio text,
  locale text not null default 'en-US',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table auth_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  provider_user_id text not null,
  password_hash text,
  created_at timestamptz not null default now(),
  unique (provider, provider_user_id)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  refresh_token_hash text not null,
  device_name text,
  ip_address inet,
  user_agent text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references users(id) on delete cascade,
  addressee_id uuid not null references users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table blocks (
  blocker_id uuid not null references users(id) on delete cascade,
  blocked_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table movies (
  id uuid primary key default gen_random_uuid(),
  tmdb_id int not null unique,
  imdb_id text,
  title text not null,
  original_title text,
  overview text,
  release_date date,
  runtime_minutes int,
  original_language text,
  poster_path text,
  backdrop_path text,
  tmdb_vote_average numeric(3,1),
  tmdb_vote_count int,
  popularity numeric,
  status text,
  adult boolean not null default false,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table movie_genres (
  tmdb_id int primary key,
  name text not null
);

create table movie_genre_links (
  movie_id uuid not null references movies(id) on delete cascade,
  genre_tmdb_id int not null references movie_genres(tmdb_id),
  primary key (movie_id, genre_tmdb_id)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  movie_id uuid not null references movies(id) on delete restrict,
  rating numeric(2,1) not null check (rating >= 0 and rating <= 5),
  quick_take text,
  body text,
  contains_spoilers boolean not null default false,
  visibility text not null default 'friends' check (visibility in ('private', 'friends')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, movie_id)
);

create table review_revisions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  rating numeric(2,1) not null,
  quick_take text,
  body text,
  contains_spoilers boolean not null,
  created_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  parent_comment_id uuid references comments(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null,
  depth int not null default 0,
  score int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table comment_votes (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  actor_id uuid references users(id) on delete set null,
  type text not null,
  entity_type text not null,
  entity_id uuid not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id) on delete cascade,
  entity_type text not null check (entity_type in ('review', 'comment', 'user')),
  entity_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz not null default now()
);

create table tmdb_sync_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running', 'succeeded', 'failed')),
  cursor jsonb,
  stats jsonb,
  error text
);
```

### Important indexes

```sql
create index idx_reviews_feed on reviews (user_id, created_at desc) where deleted_at is null;
create index idx_reviews_movie on reviews (movie_id, created_at desc) where deleted_at is null;
create index idx_comments_review_parent on comments (review_id, parent_comment_id, score desc, created_at asc);
create index idx_friendships_requester on friendships (requester_id, status);
create index idx_friendships_addressee on friendships (addressee_id, status);
create index idx_movies_title_trgm on movies using gin (title gin_trgm_ops);
create index idx_movies_release_date on movies (release_date desc);
create index idx_notifications_unread on notifications (user_id, created_at desc) where read_at is null;
```

## 7. API Design

Use REST for MVP. It is simple, cacheable, mobile-friendly, and easy to debug. GraphQL can come later if the clients become complex.

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/password/forgot`
- `POST /auth/password/reset`
- `POST /auth/email/verify`

### Users and profiles

- `GET /me`
- `PATCH /me`
- `GET /users/:username`
- `GET /users/search?q=`
- `POST /users/:id/block`
- `DELETE /users/:id/block`

### Friendships

- `POST /friend-requests`
- `GET /friend-requests/incoming`
- `GET /friend-requests/outgoing`
- `POST /friend-requests/:id/accept`
- `POST /friend-requests/:id/decline`
- `DELETE /friends/:userId`
- `GET /friends`

### Movies

- `GET /movies/search?q=&page=`
- `GET /movies/:id`
- `GET /movies/tmdb/:tmdbId`
- `GET /movies/upcoming?region=&page=`
- `GET /movies/:id/friends-reviews`

Behavior:

- Search first checks local DB.
- If not enough results, call TMDB `/search/movie`.
- Upsert selected TMDB movies into local DB.
- Movie detail can call TMDB details on cache miss or stale data.

### Feed

- `GET /feed?cursor=`

Response should include denormalized data needed to render fast:

```json
{
  "items": [
    {
      "reviewId": "uuid",
      "createdAt": "2026-05-15T12:00:00Z",
      "rating": 4.5,
      "quickTake": "Huge, strange, beautiful.",
      "containsSpoilers": false,
      "commentCount": 12,
      "author": {
        "id": "uuid",
        "username": "mari",
        "displayName": "Mari",
        "avatarUrl": "https://..."
      },
      "movie": {
        "id": "uuid",
        "tmdbId": 693134,
        "title": "Dune: Part Two",
        "releaseYear": 2024,
        "posterUrl": "https://...",
        "backdropUrl": "https://..."
      }
    }
  ],
  "nextCursor": "opaque"
}
```

### Reviews

- `POST /reviews`
- `GET /reviews/:id`
- `PATCH /reviews/:id`
- `DELETE /reviews/:id`
- `GET /users/:username/reviews`
- `GET /movies/:id/reviews/friends`

Create review body:

```json
{
  "movieId": "uuid",
  "rating": 4.5,
  "quickTake": "Huge, strange, beautiful.",
  "body": "Longer review text...",
  "containsSpoilers": false,
  "visibility": "friends"
}
```

### Comments

- `GET /reviews/:id/comments?sort=best&cursor=`
- `POST /reviews/:id/comments`
- `POST /comments/:id/replies`
- `PATCH /comments/:id`
- `DELETE /comments/:id`
- `PUT /comments/:id/vote`
- `DELETE /comments/:id/vote`

Vote body:

```json
{ "value": 1 }
```

### Speech transcription

Two viable MVP options:

1. Device-first:
   - Use iOS/Android speech recognition through Expo/React Native packages.
   - Lower backend cost.
   - Quality and availability differ by platform and locale.

2. API-first:
   - Upload short audio chunks to backend.
   - Backend sends audio to a speech-to-text provider.
   - More consistent UX and easier analytics, but higher cost and privacy obligations.

Recommended MVP: device-first where supported, backend fallback for unsupported devices. The review API should only receive final text unless you decide to store audio later.

If using backend fallback:

- `POST /transcriptions`
- `Content-Type: multipart/form-data`
- Fields: `audio`, `locale`, `durationMs`
- Response: `{ "text": "..." }`

Backend rules:

- Limit duration, file size, and request rate.
- Delete raw audio immediately after transcription unless explicit consent exists.
- Never expose provider API keys to the app.

### Notifications

- `GET /notifications`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`

Notification types:

- `friend_request_received`
- `friend_request_accepted`
- `review_commented`
- `comment_replied`
- `comment_voted`

## 8. Feed Query Strategy

### Simple MVP query

1. Get accepted friend IDs.
2. Fetch recent reviews where `user_id in friend_ids`.
3. Join movie and author data.
4. Cursor paginate by `(created_at, id)`.

This is fine until users have many friends and high review volume.

### Later scalable model

Create `feed_items`:

- On review publish, fan out to accepted friends.
- Store `viewer_id`, `review_id`, `author_id`, `created_at`.
- Query becomes cheap by `viewer_id`.

Do not start with fanout unless performance forces it. The MVP has more product risk than feed scale risk.

## 9. TMDB Integration

TMDB should be treated as the catalog source, not as the social database.

### Current TMDB endpoints to use

- Getting started and auth: https://developer.themoviedb.org/reference/intro/getting-started
- Search movies: https://developer.themoviedb.org/reference/search-movie
- Movie details: `GET /3/movie/{movie_id}`
- Upcoming movies: https://developer.themoviedb.org/reference/movie-upcoming-list
- Discover movies: https://developer.themoviedb.org/reference/discover-movie
- Movie change list: https://developer.themoviedb.org/reference/changes-movie-list
- Per-movie changes: https://developer.themoviedb.org/reference/movie-changes
- Configuration/images: https://developer.themoviedb.org/reference/configuration-details

### Local storage policy

Store:

- TMDB ID.
- Title/original title.
- Overview.
- Release date.
- Runtime.
- Poster path.
- Backdrop path.
- Genres.
- Original language.
- Popularity and TMDB vote stats.
- Last synced timestamp.

Do not store:

- Every TMDB field.
- Images as files unless you have a licensing/caching reason.
- User reviews from TMDB.

### Image handling

Call TMDB configuration to obtain image base URLs and supported sizes. Store only poster/backdrop paths in `movies`; build URLs in API responses or client config.

### Daily scheduler jobs

Jobs:

1. `tmdb:configuration`
   - Frequency: daily.
   - Refresh image config and static metadata.

2. `tmdb:upcoming`
   - Frequency: daily, region-aware.
   - Call `/movie/upcoming`.
   - Upsert movies.
   - Track pages fetched and counts.

3. `tmdb:movie-changes`
   - Frequency: daily.
   - Call `/movie/changes` for the last 24 hours or from last successful cursor.
   - For changed movie IDs that exist locally, refresh details.

4. `tmdb:popular-seed`
   - Frequency: daily or weekly.
   - Use `/discover/movie` or popular endpoints to seed browse/search quality.

### Cache freshness

- Movie selected by a user: refresh if older than 7 days.
- Upcoming movies: refresh daily.
- Movie in active feed/review: refresh opportunistically if older than 30 days.
- TMDB changes job updates known changed records sooner.

### Failure handling

- Store every sync run in `tmdb_sync_runs`.
- Retry transient failures with backoff.
- Never block review creation if TMDB refresh fails after the movie was already cached.
- Alert if daily sync fails twice in a row.

## 10. Moderation, Privacy, And Safety

Even a friends-only app needs moderation primitives.

MVP:

- Block user.
- Report review/comment/profile.
- Soft delete reviews/comments.
- Hide content from blocked users.
- Rate limit comments, votes, friend requests, and transcriptions.
- Spoiler flag with reveal step.

Later:

- Admin dashboard.
- Automated toxicity/spam checks.
- Muted words.
- Private account approvals.

## 11. Rating System

Recommended MVP rating:

- 0.5 increments from 0 to 5.
- Display as stars or a branded popcorn/ticket scale.
- Store as numeric `0.0` to `5.0`.

Why:

- Familiar.
- Easy to compare.
- Works across future categories.

Optional later:

- "Vibe tags": funny, slow, scary, beautiful, overrated, comfort watch.
- Per-friend average.
- Rewatch score.

## 12. Design System Direction

### Brand feel

CritiCool should feel social, witty, and cinematic, not like a corporate review database.

### Color direction

Use a mostly neutral app shell with strong accents from movie artwork. Avoid a single-color theme. Suggested palette:

- Background: near-white or near-black depending on theme.
- Text: high contrast neutral.
- Accent 1: ticket red.
- Accent 2: electric cyan.
- Accent 3: popcorn yellow.
- Success: green.
- Warning/spoiler: amber.

### Components

- Review card.
- Movie poster tile.
- Rating control.
- Spoiler badge.
- User avatar.
- Threaded comment.
- Vote control.
- Microphone recording control.
- Empty states.
- Friend request row.
- Notification row.

### Empty states

Feed empty:

- "No friend reviews yet."
- CTA: find friends.

No friends:

- Suggest username search and invite link.

No movie search result:

- Show TMDB-powered search retry and region/language hints.

## 13. Suggested App Screens

### Onboarding

- Welcome.
- Create account.
- Pick username.
- Add avatar.
- Choose favorite genres.
- Find friends.

### Feed

- Friends reviews.
- Cursor pagination.
- Pull to refresh.
- Filter: all friends, close friends later.

### Review Detail

- Full review.
- Comment thread.
- Reply composer.

### Search

- Movie search.
- Upcoming movies.
- Trending/popular seed.
- Recently reviewed by friends.

### Movie Detail

- Movie metadata.
- Friend ratings distribution.
- Friends who reviewed.
- CTA to review.
- CTA to add to watchlist later.

### Create Review

- Movie selector.
- Rating.
- Quick take.
- Full review editor.
- Microphone transcription.
- Spoiler toggle.

### Profile

- User info.
- Review count.
- Average rating.
- Recent reviews.
- Friends.

### Notifications

- Friend requests.
- Comment replies.
- Review comments.

### Settings

- Account.
- Privacy.
- Blocked users.
- Notification preferences.
- Delete account.

## 14. MVP Milestones

### Milestone 1: Foundation

- Repo setup.
- API service.
- PostgreSQL schema and migrations.
- Auth.
- User profile.
- Basic mobile shell.

### Milestone 2: TMDB catalog

- TMDB client.
- Movie search.
- Movie detail cache.
- Upcoming sync job.
- Change sync job.

### Milestone 3: Social graph

- Friend requests.
- Friend list.
- Authorization rules.
- Profile visibility.

### Milestone 4: Reviews and feed

- Create review.
- Edit/delete review.
- Feed endpoint.
- Feed UI.
- Movie detail friends' reviews.

### Milestone 5: Discussion

- Review detail.
- Comments.
- Replies.
- Comment votes.
- Notifications.

### Milestone 6: Voice and polish

- Microphone transcription.
- Spoiler handling.
- Empty states.
- Rate limiting.
- Reporting/blocking.
- Beta instrumentation.

## 15. Engineering Risks

### Feed permissions

Risk: leaking reviews outside accepted friendships.

Mitigation:

- Centralize visibility checks.
- Add API tests for friend, stranger, blocked user, deleted user, and self cases.

### Threaded comments

Risk: deeply nested comments become hard to render and query.

Mitigation:

- Cap depth to 3 for MVP.
- Store `depth`.
- Render deeper replies as "continue thread" later.

### Speech transcription

Risk: privacy concerns and inconsistent mobile support.

Mitigation:

- Store final text only by default.
- Show clear recording state.
- Add duration limits.
- Support manual editing before publish.

### TMDB dependency

Risk: API failure slows review creation or search.

Mitigation:

- Cache selected movies locally.
- Retry jobs.
- Let users review cached movies even if TMDB is temporarily unavailable.

### Social cold start

Risk: empty feed until users add friends.

Mitigation:

- Strong friend discovery.
- Invite links.
- Onboarding prompt to add friends.
- Search screen with upcoming/popular movies even when feed is empty.

## 16. Initial Testing Plan

Backend tests:

- Auth registration/login/refresh.
- Friendship state transitions.
- Review visibility matrix.
- One review per user/movie.
- Comment creation and depth cap.
- Vote idempotency and score updates.
- TMDB upsert behavior.

Mobile tests:

- Feed renders empty and populated states.
- Review creation flow.
- Spoiler review reveal.
- Comment reply flow.
- Microphone permission denied state.

Manual QA:

- User A friends User B and sees B reviews.
- User C not friends with B cannot see B reviews.
- User A blocks User B and content disappears both ways.
- TMDB search result can be reviewed.
- Upcoming movies sync creates local movie records.

## 17. Analytics Events

Keep analytics privacy-conscious.

- `signup_completed`
- `friend_request_sent`
- `friend_request_accepted`
- `movie_searched`
- `review_started`
- `review_published`
- `review_opened`
- `comment_created`
- `voice_transcription_started`
- `voice_transcription_completed`
- `feed_empty_seen`

Avoid logging raw review text, comment text, or transcript text.

## 18. Open Product Decisions

### Review visibility

MVP recommendation: friends-only.

Future options:

- Private.
- Friends.
- Public.
- Close friends.

### Review voting

MVP recommendation: comments have votes, reviews do not.

Reason: voting on friends' reviews can make the product feel performative early. Let discussion quality be ranked while reviews remain personal.

### Rating symbol

MVP recommendation: standard 5-star control internally, visually experiment with popcorn/tickets later.

### Content expansion

MVP recommendation: model reviews so `reviews` can later point to a generic `review_subjects` table, but do not overbuild it now. Movies are enough for the first launch.

## 19. Future Multi-category Model

When expanding beyond movies, introduce:

```text
review_subjects
- id
- type: movie | tv | game | book | restaurant | product
- external_source
- external_id
- title
- subtitle
- image_url
- metadata jsonb
```

Then migrate movie reviews from `movie_id` to `subject_id`. For MVP, direct `movie_id` is simpler and safer.

## 20. Recommended Next Step

Build a clickable mobile prototype first:

1. Feed.
2. Review detail with threaded comments.
3. Create review with microphone state.
4. Movie search/select.
5. Profile/friend flow.

Once the prototype feels right, implement the backend foundation and TMDB cache. This avoids locking the data model around a UI that has not been felt on a phone yet.

