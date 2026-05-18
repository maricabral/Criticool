# CritiCool Current Design Review

Date: 2026-05-18

This review reflects the current app direction after removing the movie-tape feed and adopting the UP DOG logo/mascot.

## Overall Assessment

The app still has the CritiCool identity: warm cream backgrounds, thick ink outlines, soft pink/cyan/yellow accents, rounded controls, popcorn ratings, and a playful social movie-review tone.

Removing the movie tape was a good decision. The feed is cleaner, easier to scan, and less visually cramped. The new direction should be: **simple chunky cards, warm surfaces, playful accents, round avatars, and UP DOG as the brand personality.**

The main issue now is that several screens feel unfinished because they are too empty. Search and Post especially need richer empty/default states. Friends needs a stronger color system. Me is currently the strongest screen and should be used as the quality bar.

## Visual Identity Checks

### What Is Working

- Warm cream/tan background feels distinct and friendly.
- Thick black outlines are recognizable and match the cute sketchy direction.
- Bottom navigation is clear and consistent.
- Feed cards are much easier to read without the full movie-tape rail.
- Round avatars are working.
- Popcorn ratings are a strong brandable detail.
- UP DOG gives the product a memorable mascot.

### What Needs Correction

- Some screens are too empty and look like placeholders.
- Search and Post both start as a single search field on a blank page.
- Friends page needs more intentional color treatment.
- Feed cards should use a stable compact layout: movie first, reviewer as a small top-right label, rating centered in the review content, and comments anchored bottom-right.
- The app should use UP DOG intentionally, not everywhere.

## Screen Recommendations

### Feed

Keep the current non-tape feed.

Suggested refinements:

- Put the movie title first.
- Keep reviewer identity as a compact top-right label, with spoiler status directly below it.
- Keep comment count anchored bottom-right, with participant avatars below the count when comments exist.
- Center the popcorn rating inside the review content area so the rating reads as the main action the reviewer took.
- Limit tags to 1-2 visible chips.
- Make poster size consistent across cards.
- Keep spoiler label small and orange.
- Keep all feed cards the same fixed height.
- Consider slightly increasing vertical spacing between cards for a calmer feed.

Do not bring back the full movie tape. If film-strip identity is needed, use it only as a tiny accent in empty states or onboarding.

### Search

Current issue:

- The screen has only a title and a search field, so it feels unfinished before typing.

Recommended additions:

- Add a `Buzz movies` section below the search field.
- Add a `Browse by genre` section so the empty state has useful exploration before typing.
- Avoid a bottom helper card; it makes the screen feel explanatory instead of usable.
- Keep suggestions clearly secondary to search.

Suggested default layout:

1. Search field.
2. Buzz movies horizontal poster row.
3. Browse by genre grid.

### Post

Current issue:

- Before selecting a movie, Post is almost identical to Search and feels empty.

Recommended additions:

- Keep the flow: search movie first, then show the review form.
- Add a friendly pre-selection state with:
  - short prompt,
  - search field,
  - `Recently reviewed by friends`,
  - `Buzz movies to review`,
  - optional `Draft idea`/tag suggestions.
- Once a movie is selected, progressively reveal:
  - selected movie card,
  - rating,
  - quick take,
  - tags,
  - full review,
  - spoiler toggle,
  - Post button.

The Post start screen should feel like a guided entry point, not an empty form.

### Friends

Current issue:

- The screen is structurally fine but visually odd. It does not yet have the fun color system from the earlier mockups.

Recommended treatment:

- Use avatar bubbles with varied soft background colors:
  - cyan,
  - pink,
  - yellow,
  - green,
  - orange.
- Keep friend items simple: round image/avatar plus username label.
- Avoid full cards unless there is an incoming request requiring actions.
- Use small status indicators:
  - cyan ring: friend,
  - yellow dot: pending,
  - pink plus: addable.

Suggested sections:

1. Search friends field.
2. Incoming requests as compact pills/cards with Accept/Decline.
3. Friends grid: avatar + name only.
4. Suggestions grid: avatar + name + tiny plus badge.

### Me

Current status:

- Me is the strongest screen so far.
- It has a clear profile block, stats, and review list.

Suggested improvements:

- Add UP DOG only if it supports the profile identity, for example as a tiny settings/account mascot, not a large decoration.
- Keep review cards consistent with feed cards.
- Consider color-coded stats:
  - reviews: yellow,
  - friends: cyan,
  - average rating: pink.
- Add an empty state for users with no reviews.

### Welcome

Current direction:

- UP DOG is the approved logo/mascot.
- Welcome should remain separate from signup.

Keep:

- UP DOG.
- `CritiCool`.
- Short tagline.
- One primary `Create account`.
- One secondary `Log in`.

Avoid:

- Showing signup fields on the welcome state.
- Duplicating `Create account`.
- Mixing UP DOG with the older film-reel mascot.

## Updated UX Mockup

Use `resources/critcool-ux-mockups-current.html` as the updated visual reference for the next design pass.

The updated mockup includes:

- Welcome with UP DOG.
- Clean feed without movie tape.
- Search with buzz movies and friend discussion suggestions.
- Post start state with richer guidance before movie selection.
- Post form after movie selection.
- Friends page with colorful avatar-grid treatment.
- Me page with small improvements.

## Acceptance Checklist

- App still feels warm, cute, and CritiCool-specific without relying on the movie tape.
- Search has useful default content before typing.
- Post has a guided movie-first flow before the review form appears.
- Friends uses colorful round avatar bubbles, not heavy rows everywhere.
- Me remains clean and becomes the reference for profile/review polish.
- UP DOG is the only mascot/logo direction used.
- No screen should feel like just a title plus one search field on empty cream space.
