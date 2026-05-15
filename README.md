# CritiCool

Private-first social movie reviews. Phase 1 proves the core loop: register, find a movie, write a review, become friends, and see friends' reviews in a feed.

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
- `npm run prisma:generate` generates the Prisma client.
- `npm run prisma:migrate` applies local migrations.

No secrets should be committed. Keep real values only in `.env` files.
