# CritiCool

Private-first social movie reviews. CritiCool starts with movies and a friends-only feed, then opens each review into a threaded discussion space.

Phase 2 is now the working baseline: session refresh, logout, active-review uniqueness, comment edit/delete/sort/vote removal, notifications, reports, blocks, focused backend tests, and a repeatable API smoke script are in place.

## Current Status

- Phase 1 core loop: register, find/import a movie, post a review, become friends, and see friend reviews in the feed.
- Phase 2 social layer: review detail comments, replies, comment voting, notifications, report/block entry points, and mobile review-detail controls.
- Verified locally with `npm test` and `npm run build --workspaces --if-present`.
- Known Phase 2 follow-up: blocked-user comments are hidden from review detail rows, but feed/review comment counts and feed participant avatars should also exclude blocked comment authors.

## Project Plans

- Product plan: `resources/plans/CRITICOOL_PRODUCT_PLAN.md`
- Phase 1 plan: `resources/plans/CRITICOOL_PHASE_1.md`
- Phase 2 plan and audit: `resources/plans/CRITICOOL_PHASE_2_PLAN.md`
- Phase 3 plan: `resources/plans/CRITICOOL_PHASE_3_PLAN.md`

## Stack

- Monorepo with npm workspaces.
- API: NestJS, Prisma, PostgreSQL, JWT auth.
- Mobile: Expo React Native.
- Shared package: TypeScript API DTO shapes.
- Local infra: PostgreSQL and Redis through Docker Compose.

## Setup

```bash
npm install
copy apps\api\.env.example apps\api\.env
copy apps\mobile\.env.example apps\mobile\.env
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
```

Set `TMDB_ACCESS_TOKEN` in `apps/api/.env` before using live movie search.

## Run

```bash
npm run dev:api
npm run dev:mobile
```

API health check:

```bash
curl http://localhost:3000/health
```

Expo reads `EXPO_PUBLIC_API_URL` from `apps/mobile/.env`. For a physical phone, use your computer LAN IP instead of `localhost`.

## Useful Scripts

- `npm run build` builds packages that expose a build script.
- `npm test` runs workspace tests.
- `npm run qa:smoke` runs the API smoke flow against `http://localhost:3000` by default.
- `npm run prisma:generate` generates the Prisma client.
- `npm run prisma:migrate` applies local migrations.

Smoke QA requires the API and database to be running. To target a different API URL:

```bash
npm run qa:smoke -- http://localhost:3000
```

No secrets should be committed. Keep real values only in `.env` files.

## UX And Visual Standards

This section is the working design contract for future CritiCool work. Keep new screens consistent with these rules unless a deliberate design review changes them.

### Product Feel

CritiCool should feel social, witty, cinematic, and private-first. It should not feel like a generic movie database or a marketing landing page.

Core UX principles:

- Friends first: the feed is about people you know, so reviewer identity is always a primary signal.
- Review first, essay second: feed cards show reviewer, movie, rating, quick take or spoiler state, tags, and comment count. Full review text belongs on review detail.
- Discussion has structure: review detail is where threaded comments, votes, replies, and spoiler reveal/hide behavior live.
- Low-friction posting: the post flow should reveal only the next necessary controls and avoid making the empty form feel crowded.
- Movie art carries the cinematic feel. Decorative film treatment must be restrained.

### Brand Assets

The approved mascot/logo is named **UP DOG**.

Use UP DOG:

- On welcome, loading, auth, empty, and celebratory states.
- As the app icon/splash/logo source where the current brand asset is required.
- On warm or colored backgrounds, because the mark is mostly white.

Do not redraw or reinterpret UP DOG in code unless a new approved asset is created. Use the existing files in `resources/brand/` and the copied mobile assets in `apps/mobile/assets/`.

### Color And Typography

Current palette:

- Ink: `#171217`
- Paper: `#f8dfb9`
- Cream: `#ffe8bb`
- Surface: `#fff0d2`
- Pink: `#dd6aa5`
- Cyan: `#45c2dc`
- Yellow: `#ffd668`
- Orange/spoiler: `#ff8a3d`
- Green: `#83ce9f`
- Muted text: `#736b73`

Rules:

- Use warm paper/surface backgrounds for the app shell.
- Use ink for primary text and outlines.
- Use pink for primary actions and active tab state.
- Use cyan for avatars and selected chips.
- Use yellow for secondary actions and popcorn-adjacent affordances.
- Use orange only for spoiler/warning states, not as a general accent.
- Keep text bold and rounded where possible. Avoid thin typography.
- Keep letter spacing at `0`.
- Do not create one-note pages dominated by a single accent color.

### Shape, Borders, And Decoration

CritiCool uses chunky outlines, compact cards, rounded chips, and small hard shadows.

Rules:

- Use 2-3px ink borders for important controls and cards.
- Use 8-16px radius for cards. Avoid huge soft marketing cards.
- Use 999px radius for pills, chips, toggles, and circular buttons.
- Use shadows sparingly and keep them short/hard, not blurred.
- Do not nest cards inside cards.
- Do not use decorative gradient blobs or ornamental background shapes.
- The film-strip motif is allowed for brand moments, empty states, and historical mockup references. Do not wrap the main feed or review detail cards in film tape.

### Navigation

Bottom tabs are:

- Feed
- Search
- Post
- Friends
- Me

Rules:

- The active tab uses pink.
- The Post tab is a normal destination, not a modal unless a future design explicitly changes this.
- Header actions should be concise icon buttons or compact primary buttons.

### Feed Cards

Feed cards must be glanceable.

Required hierarchy:

1. Reviewer row: avatar, display name, username, timestamp.
2. Comment cluster anchored on the top right: spoiler state above, comment count, then recent participant avatars when present.
3. Movie row: poster, title, rating, and quick take when safe to preview.
4. Optional tags: show at most two tags on feed cards.

Rules:

- Do not show full review body in the feed.
- Do not expose quick take text for spoiler reviews.
- Spoiler state lives in the comment cluster above the comment count, not as a large standalone pill.
- Show up to three recent unique comment participants on cards with active discussion.
- Tags are secondary. They should fit beside each other when space allows.
- Movie title can truncate to one line in feed.
- Reviewer identity should never sit below the score.

### Review Detail

Review detail is the discussion page.

Rules:

- Use a plain detail header card, not a film-tape wrapper.
- Show reviewer, poster, movie title, rating, and spoiler state.
- If a review contains spoilers, hide spoiler content until the user taps Reveal spoilers.
- After spoilers are revealed, provide a Hide spoilers action.
- Show tags below the header, usually capped to the most relevant one or two in compact areas.
- Comments should remain visible below the review body area.

### Profile And My Reviews

Rules:

- Do not show the user's email address on the Me page.
- Show a local search field under `My reviews` when reviews are loaded.
- The search should filter loaded reviews by movie title, year, quick take, spoiler state, reviewer, and tags.
- Profile review cards use the same card pattern as the feed.

### Post Flow

The Post screen is progressive.

Rules:

- Before a movie is selected, show only the header, movie search input, loading state, and movie results.
- Hide rating, quick take, tags, full review, spoiler toggle, and post buttons until a movie is selected.
- After selection, show a selected movie row with poster, title, year, and Change action.
- Post remains disabled until the selected movie has a local `id` and rating is greater than `0`.
- The spoiler control is a labeled toggle: `Contains spoilers`.
- Default spoiler state is off.

### Review Tags

Tags should be useful first and playful second.

Featured tags:

- `comfort watch`
- `date night`
- `great with friends`
- `thought-provoking`
- `instant rewatch`
- `bring tissues`
- `slow burn`
- `best with snacks`

Categories:

- Mood
- Viewing Context
- Pace
- Craft
- Audience
- Content Notes
- Wildcards

Rules:

- Keep the maximum of 5 selected tags.
- Keep playful tags mostly in Wildcards.
- Do not make every tag silly. The product should feel witty, not random.
- The current API accepts string arrays. If tags become app-owned metadata later, add server-side validation and shared constants.

### Comments And Votes

Comments are threaded and can be voted on.

Rules:

- Upvote/downvote applies per user per comment.
- Tapping the active vote again does nothing.
- Tapping the opposite vote first removes the current vote and restores the score.
- Tapping the now-inactive opposite vote applies that vote.
- Active vote states must be visually distinct.
- Reply actions should stay close to the comment body.
- Keep comments readable. Dense discussion is acceptable, but controls must not crowd the text.

### Accessibility And Copy

Rules:

- Favor direct labels: `Contains spoilers`, `Reveal spoilers`, `Hide spoilers`, `Post comment`.
- Avoid ambiguous labels like `Spoiler-free` as a button.
- Keep touch targets at least 40px when practical.
- Keep icon-only controls familiar. When unclear, use text.
- Do not place explanatory product copy inside core workflow screens unless it resolves an immediate empty state or error.

### Current UX Mockups

- Historical reference: `resources/critcool-ux-mockups.html`
- Current direction: `resources/critcool-ux-mockups-current.html`

Use the current mockups for future layout work. Keep the historical mockup intact for comparison.
