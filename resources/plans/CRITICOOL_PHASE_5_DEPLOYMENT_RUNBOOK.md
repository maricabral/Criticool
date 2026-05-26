# CritiCool Phase 5 Deployment Runbook

Date: 2026-05-26

## Purpose

This runbook turns the Phase 5 implementation into a repeatable production-backed
phone beta checklist. The target is still **internal distribution**, not app-store
release: testers should be able to install CritiCool on real Android/iOS devices
and use Supabase Auth, hosted Postgres, and the Render API without a laptop dev
server.

## Source Of Truth

- Phase plan: `resources/plans/CRITICOOL_PHASE_5_PLAN.md`
- API deploy config: `render.yaml`
- EAS build config: `eas.json`
- API env template: `apps/api/.env.example`
- Mobile env template: `apps/mobile/.env.example`
- Preflight script: `scripts/phase5-preflight.mjs`

## Preflight Commands

Run these before creating hosted builds:

```bash
npm run phase5:preflight
npm run build --workspaces --if-present
npm test
```

After local `.env` files are populated with hosted beta values, run:

```bash
npm run phase5:preflight:env
```

After Render is live, run:

```bash
node scripts/phase5-preflight.mjs --api-url=https://<render-service>.onrender.com
```

The preflight script intentionally prints pass/fail metadata only; it does not
print secret values.

## 1. Supabase Project Setup

1. Create a fresh Supabase project for the beta database.
2. Capture these values for deployment:
   - Project URL: `https://<project-ref>.supabase.co`
   - Publishable key for Expo: `sb_publishable_...`
   - Service role key for the API host only.
   - Postgres connection string for Prisma `DATABASE_URL`.
3. In Supabase Auth, enable email/password sign-in.
4. Configure URL settings for the mobile deep links used by the app:
   - `criticool://auth/callback`
   - `criticool://auth/reset-password`
5. Configure Auth email delivery through Resend SMTP:
   - Verify the sending domain in Resend.
   - Use a production sender such as `no-reply@<criticool-domain>`.
   - Copy Resend SMTP host, port, username, and API-key password into Supabase.
6. Prefer asymmetric Supabase JWT signing keys for hosted beta if available on
   the project. The API verifies Supabase access tokens through:
   - `SUPABASE_JWKS_URL=https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`

## 2. Render API Setup

1. Create the Render Web Service from `render.yaml`.
2. Set all dashboard-supplied environment variables:
   - `DATABASE_URL`
   - `DIRECT_URL` when required by the hosted database/provider
   - `SUPABASE_URL`
   - `SUPABASE_JWKS_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CORS_ORIGINS`
   - `TMDB_ACCESS_TOKEN`
   - `TRANSLATION_ENDPOINT_URL` and `TRANSLATION_API_KEY` if translation is live
3. Confirm the fixed production safety values:
   - `AUTH_PROVIDER=supabase`
   - `ACCOUNT_DEV_TOKENS=false`
4. Render should run:
   - Build: `npm ci && npm run prisma:generate -w @criticool/api && npm run build --workspaces --if-present`
   - Pre-deploy: `npm run prisma:migrate:deploy -w @criticool/api`
   - Start: `npm run start:prod -w @criticool/api`
5. Verify:

```bash
curl https://<render-service>.onrender.com/health
curl https://<render-service>.onrender.com/health/ready
node scripts/phase5-preflight.mjs --api-url=https://<render-service>.onrender.com
```

Expected readiness response includes `"database":"ready"`.

## 3. EAS Internal Build Setup

1. Log in only when you are ready to create/update Expo project state:

```bash
npx eas login
```

2. Configure the EAS `preview` environment values:

```bash
npx eas env:create --environment preview --visibility plaintext --name EXPO_PUBLIC_API_URL --value https://<render-service>.onrender.com
npx eas env:create --environment preview --visibility plaintext --name EXPO_PUBLIC_SUPABASE_URL --value https://<project-ref>.supabase.co
npx eas env:create --environment preview --visibility plaintext --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_<value>
```

The `EXPO_PUBLIC_*` values are embedded in the client build and must be treated
as public configuration, not secrets.

3. Register iOS test devices before the iOS internal build:

```bash
npx eas device:create
```

4. Build Android and iOS internal previews:

```bash
npx eas build --profile preview --platform android
npx eas build --profile preview --platform ios
```

5. Install from the EAS internal build links on real devices.

## 4. Hosted Smoke QA

Use this checklist on the Render URL and then on the installed phone builds:

- Create a new account.
- Confirm the Supabase verification email is delivered through Resend.
- Open the verification deep link back into CritiCool.
- Finish profile bootstrap with display name and username.
- Log out and log back in.
- Create or search a movie, post a review, comment, and reply.
- Create a friendship path and confirm the feed reflects friend reviews.
- Request password reset and complete the deep-link reset flow.
- Open account settings and confirm profile edits stay API-owned.
- Delete the test account from settings and confirm the in-app confirmation
  appears before deletion.
- Confirm the deleted account cannot log in again.

## 5. Rollback / Safety

- Keep local development on the legacy/local auth path unless actively testing
  hosted Supabase auth.
- If Render readiness fails after migration, stop beta distribution and inspect
  the Render pre-deploy logs before creating new EAS builds.
- If Auth email delivery fails, pause onboarding and validate Resend domain,
  sender, API key, and Supabase SMTP settings.
- If EAS builds have incorrect API/Auth values, update EAS `preview` environment
  variables and rebuild; OTA updates are not enough for values embedded at build
  time.
- Never commit `.env` files or service-role credentials.

## References

- Expo EAS environment variables:
  <https://docs.expo.dev/eas/environment-variables/>
- Expo EAS internal distribution:
  <https://docs.expo.dev/build/internal-distribution/>
- Supabase Auth redirect URLs and mobile deep links:
  <https://supabase.com/docs/guides/auth/redirect-urls>
- Supabase custom SMTP:
  <https://supabase.com/docs/guides/auth/auth-smtp>
- Supabase JWT verification / JWKS:
  <https://supabase.com/docs/guides/auth/jwts>
- Supabase Auth admin user deletion:
  <https://supabase.com/docs/reference/javascript/auth-admin-deleteuser>
- Render deploys and pre-deploy commands:
  <https://render.com/docs/deploys>
- Render blueprints:
  <https://render.com/docs/infrastructure-as-code>
- Prisma migrate deploy:
  <https://docs.prisma.io/docs/cli/migrate/deploy>
- Prisma on Render:
  <https://docs.prisma.io/docs/orm/prisma-client/deployment/traditional/deploy-to-render>
- Resend with Supabase SMTP:
  <https://resend.com/docs/send-with-supabase-smtp>
