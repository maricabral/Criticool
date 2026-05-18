# CritiCool Updated Design Plan

Date: 2026-05-18

This plan reflects the current approved UX mockup in `resources/critcool-ux-mockups-current.html`.

## Current Direction

CritiCool should feel warm, cute, social, and easy to scan. The approved identity uses cream/tan surfaces, thick black outlines, soft pink/cyan/yellow/green/orange accents, round avatars, popcorn ratings, and UP DOG as the only mascot/logo direction.

The movie-tape feed has been removed. Keep the feed clean and card-based, using movie posters, popcorn ratings, comment activity, and soft color accents for personality.

## Screen Direction

### Welcome

- Use UP DOG as the main brand image.
- Keep the welcome state simple: logo/mascot, `CritiCool`, short tagline, `Create account`, and `Log in`.
- Do not show signup fields on the first welcome state.
- Do not mix UP DOG with the older film-reel mascot.

### Feed

- Keep the feed tape removed.
- Use fixed-height review cards around `150px`.
- Put the movie title first, aligned top-left.
- Show reviewer name only in the top-right; do not show handle or timestamp on feed cards.
- Put the spoiler label directly under the reviewer name.
- Align the poster/content cluster upward so the poster has clear bottom breathing room.
- Make popcorn ratings large enough to be the main review signal.
- Keep tags/pills near the rating and review content.
- Show at most 3 feed tags; use compact feed-specific pill sizing.
- Anchor comment count on the right side, with participant avatars below when comments exist.
- Keep poster sizing consistent across cards.

### Search

- Default Search should not feel empty.
- Use this structure:
  1. Search field.
  2. `Buzz movies` poster row.
  3. `Browse by genre` grid.
- Do not add a bottom explanatory card like `Search any movie`.
- Keep discovery suggestions secondary to the search field.

### Post

- Keep the Post flow movie-first.
- Before a movie is selected, show a guided start state:
  - short prompt,
  - search field,
  - `Buzz movies to review`,
  - prompt/tag ideas.
- After movie selection, reveal the full review form:
  - selected movie card,
  - popcorn rating picker,
  - quick take,
  - optional tags,
  - full review field,
  - spoiler toggle,
  - Post button.
- The Post screen should feel helpful before selection, not like an empty form.

### Friends

- Use the colorful avatar-grid treatment as the target.
- Friend items should be simple: round avatar/image plus username label.
- Use compact action cards only for incoming friend requests.
- Use soft avatar colors across the grid: cyan, pink, yellow, green, and orange.
- Suggestions can use a tiny badge/status dot instead of full heavy cards.

### Me

- Treat the Me page as the quality bar for profile polish.
- Keep the personal/profile card prominent.
- Keep review count, friend count, and taste pills inside the profile card.
- Recent reviews should reuse the feed-card visual language, with extra height if needed.
- Use UP DOG sparingly here, only if it supports account/profile identity.

## Acceptance Checklist

- The app feels warm, cute, and CritiCool-specific without relying on a movie-tape feed.
- UP DOG is the only mascot/logo direction.
- Feed cards are aligned, fixed-height, and easy to scan.
- Feed cards show movie first, reviewer name only, large popcorn rating, compact tags, and right-side comment activity.
- Search has useful default content before typing.
- Post has a guided movie-first start state before the full form appears.
- Friends uses colorful round avatars instead of heavy rows everywhere.
- Me keeps stats and taste pills inside the profile card.
- No screen is just a title plus one field on empty cream space.

## Notes For Implementation

- Use `resources/critcool-ux-mockups-current.html` as the current visual source of truth.
- Keep the visual system rounded and soft, but preserve thick black outlines for brand recognition.
- Avoid adding decorative complexity that competes with movie posters, ratings, avatars, and UP DOG.
