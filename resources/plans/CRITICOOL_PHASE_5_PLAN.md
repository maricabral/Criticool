# CritiCool Phase 5: Production-Backed Phone Beta

Date: 2026-05-20

## Summary

- Move CritiCool from local-only readiness to a real-device closed beta: hosted API, shared hosted Postgres, managed auth, real auth email delivery, and EAS internal Android/iOS builds.
- Chosen stack: Supabase Auth + Supabase Postgres, Render Web Service for the Nest API, Resend SMTP for Supabase Auth emails, and a fresh beta database.
- Do not jump to app-store release yet; Phase 5 targets installable internal builds that work without a laptop dev server.

## Implementation Changes

- Create a Phase 5 UX preview at `resources/mockups/preview/phase-5-auth-beta.html` and get approval before mobile auth/settings UI changes.
- Replace mobile-owned custom auth sessions with Supabase email/password sessions using `@supabase/supabase-js`, AsyncStorage persistence, and CritiCool deep links for email confirmation/reset.
- Keep the Nest API as the domain boundary: all protected API calls use `Authorization: Bearer <Supabase access token>`.
- Add Supabase JWT verification to the API guard via JWKS, attach the app user from `public.users`, and disable legacy dev-token auth flows in production.
- Add a profile bootstrap flow that creates the CritiCool `users` row after Supabase signup/login, using Supabase user id as the app user id.
- Change account settings so display name/username stay API-owned, while email verification/reset/password recovery are handled by Supabase Auth.
- Update account deletion to hard-delete CritiCool data and delete the Supabase auth user through server-side service-role credentials only.
- Harden account deletion cleanup so reports/notifications tied to the deleted user, their reviews, and their comments are removed before the user cascade, preventing orphaned moderation/notification rows in the shared beta database.
- Polish account settings for beta usage: keep the destructive delete-account action bottom-centered, add a visible in-app confirmation dialog before deletion, and document the approved UX in `resources/mockups/preview/phase-5-auth-beta.html`.
- Add Render deployment config/scripts: build API, generate Prisma client, run `prisma migrate deploy`, start `apps/api/dist/main.js`, and expose a DB-backed readiness check.
- Configure Supabase fresh beta DB with existing Prisma migrations, Resend custom SMTP, redirect URLs for `criticool://`, and no committed secrets.
- Add EAS config for Android+iOS internal distribution with `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Add the Phase 5 deployment runbook at `resources/plans/CRITICOOL_PHASE_5_DEPLOYMENT_RUNBOOK.md` so Supabase, Render, Resend, and EAS setup can be repeated without committing secrets.
- Add the `scripts/phase5-preflight.mjs` repository/hosted-beta checker and root package scripts for config, env, and hosted API readiness validation.

## Public APIs And Config

- Protected API contract changes from CritiCool-issued JWTs to Supabase-issued JWTs.
- Add or update API env vars: `SUPABASE_URL`, `SUPABASE_JWKS_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `ACCOUNT_DEV_TOKENS=false`, `CORS_ORIGINS`, `TMDB_ACCESS_TOKEN`, and translation env vars.
- Add mobile env vars: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Add package scripts for production migration/deploy, especially `prisma migrate deploy`.
- Keep old custom auth tables only as legacy/local compatibility unless a later cleanup phase removes them.

## Test Plan

- Unit tests: Supabase JWT guard, profile bootstrap conflicts, username/display name update, account deletion cleanup including moderation/notification rows, Supabase auth-user deletion handoff, and disabled legacy auth behavior in production.
- Mobile tests: auth state restoration, signed-out reset flow state, profile bootstrap fallback, and existing navigation regression coverage.
- Smoke QA: update `scripts/qa-smoke.mjs` or add hosted smoke support using Supabase test-user setup, then run against the Render API.
- Verification commands: `npm run phase5:preflight`, `npm run build --workspaces --if-present`, `npm test`, hosted smoke QA, Render health/readiness checks, and EAS preview build validation.
- Manual real-phone QA: install Android+iOS internal builds, sign up, verify email, log in, create friendship/review/comment, reset password, confirm settings behavior, and hard-delete the test account.

## Assumptions

- Existing local data is not migrated; Phase 5 starts with a fresh shared beta database.
- First beta sign-in method is email/password only; Google/Apple OAuth are deferred.
- Resend requires a verified sending domain and a production `from` address such as `no-reply@<criticool-domain>`.
- Supabase service-role credentials stay server-side only.
- References: Expo EAS internal distribution and env docs, Supabase Auth/JWT/Prisma/SMTP docs, Render Prisma deploy docs, and Resend Supabase SMTP docs.
