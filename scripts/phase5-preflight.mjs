#!/usr/bin/env node
/**
 * CritiCool Phase 5 hosted-beta preflight.
 *
 * Default mode checks repo configuration without reading real secrets.
 * Add --env to validate local .env files for a hosted beta setup without printing values.
 * Add --api-url=https://... to verify hosted /health and /health/ready.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const checkEnv = args.includes('--env');
const apiUrlArg = args.find((arg) => arg.startsWith('--api-url='));
const apiUrl = apiUrlArg?.slice('--api-url='.length).replace(/\/$/, '');
const showHelp = args.includes('--help') || args.includes('-h');

let failures = 0;
let warnings = 0;

if (showHelp) {
  console.log(`
CritiCool Phase 5 preflight

Usage:
  npm run phase5:preflight
  npm run phase5:preflight:env
  node scripts/phase5-preflight.mjs --api-url=https://criticool-api.onrender.com

Options:
  --env              Validate local apps/api/.env and apps/mobile/.env for hosted beta values.
  --api-url=<url>    Verify hosted /health and /health/ready endpoints.
  --help             Show this help.
`);
  process.exit(0);
}

function relPath(...parts) {
  return path.join(root, ...parts);
}

function readText(relativePath) {
  return readFileSync(relPath(relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function ok(message) {
  console.log(`OK   ${message}`);
}

function warn(message) {
  warnings += 1;
  console.warn(`WARN ${message}`);
}

function fail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

function expect(condition, message) {
  if (condition) {
    ok(message);
  } else {
    fail(message);
  }
}

function expectFile(relativePath) {
  expect(existsSync(relPath(relativePath)), `${relativePath} exists`);
}

function parseEnvFile(relativePath) {
  if (!existsSync(relPath(relativePath))) {
    fail(`${relativePath} exists for --env validation`);
    return {};
  }

  const values = {};
  for (const rawLine of readText(relativePath).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function renderEnvBlock(renderYaml, key) {
  const keyMarker = `- key: ${key}`;
  const start = renderYaml.indexOf(keyMarker);
  if (start === -1) return '';
  const next = renderYaml.indexOf('\n      - key:', start + keyMarker.length);
  return renderYaml.slice(start, next === -1 ? undefined : next);
}

function checkRenderEnv(renderYaml, key, predicate, description) {
  const block = renderEnvBlock(renderYaml, key);
  expect(Boolean(block), `render.yaml declares ${key}`);
  if (block) {
    expect(predicate(block), description);
  }
}

async function checkHostedApi(target) {
  if (!target) return;
  console.log(`\nHosted API checks: ${target}`);

  for (const endpoint of ['/health', '/health/ready']) {
    try {
      const response = await fetch(`${target}${endpoint}`, {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      expect(response.ok && body?.ok === true, `${endpoint} returns ok`);
      if (endpoint === '/health/ready') {
        expect(body?.database === 'ready', '/health/ready reports database ready');
      }
    } catch (err) {
      fail(`${endpoint} request failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }
}

function requireEnv(values, key, label) {
  expect(Boolean(values[key]), `${label} sets ${key}`);
}

function checkHostedEnv() {
  console.log('\nHosted env checks (--env):');
  const apiEnv = parseEnvFile('apps/api/.env');
  const mobileEnv = parseEnvFile('apps/mobile/.env');

  for (const key of [
    'DATABASE_URL',
    'AUTH_PROVIDER',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CORS_ORIGINS',
    'TMDB_ACCESS_TOKEN',
    'ACCOUNT_DEV_TOKENS',
  ]) {
    requireEnv(apiEnv, key, 'apps/api/.env');
  }
  for (const key of [
    'EXPO_PUBLIC_API_URL',
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ]) {
    requireEnv(mobileEnv, key, 'apps/mobile/.env');
  }

  expect(apiEnv.AUTH_PROVIDER === 'supabase', 'apps/api/.env uses AUTH_PROVIDER=supabase');
  expect(apiEnv.ACCOUNT_DEV_TOKENS === 'false', 'apps/api/.env disables ACCOUNT_DEV_TOKENS');
  expect(
    Boolean(apiEnv.DATABASE_URL) && !/localhost|127\.0\.0\.1/i.test(apiEnv.DATABASE_URL),
    'apps/api/.env DATABASE_URL points at hosted Postgres',
  );
  expect(
    Boolean(mobileEnv.EXPO_PUBLIC_API_URL) &&
      mobileEnv.EXPO_PUBLIC_API_URL.startsWith('https://') &&
      !/localhost|127\.0\.0\.1/i.test(mobileEnv.EXPO_PUBLIC_API_URL),
    'apps/mobile/.env EXPO_PUBLIC_API_URL points at hosted HTTPS API',
  );
  expect(
    Boolean(apiEnv.SUPABASE_URL) &&
      apiEnv.SUPABASE_URL.replace(/\/$/, '') ===
        mobileEnv.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, ''),
    'API and mobile Supabase URLs match',
  );

  if (!apiEnv.SUPABASE_JWKS_URL) {
    warn('apps/api/.env omits SUPABASE_JWKS_URL; the API will derive the default JWKS URL');
  }
}

console.log('\nCritiCool Phase 5 hosted-beta preflight\n');

for (const file of [
  'render.yaml',
  'eas.json',
  'package.json',
  'apps/api/.env.example',
  'apps/mobile/.env.example',
  'apps/mobile/app.json',
  'apps/mobile/src/supabase.ts',
  'apps/api/src/health.controller.ts',
]) {
  expectFile(file);
}

const rootPackage = readJson('package.json');
expect(
  rootPackage.scripts?.['prisma:migrate:deploy'] ===
    'npm run prisma:migrate:deploy -w @criticool/api',
  'root package exposes prisma:migrate:deploy',
);
expect(
  rootPackage.scripts?.['phase5:preflight'] === 'node scripts/phase5-preflight.mjs',
  'root package exposes phase5:preflight',
);

const gitignore = readText('.gitignore');
expect(gitignore.includes('.env'), '.gitignore excludes .env files');
expect(gitignore.includes('.logs/'), '.gitignore excludes runtime logs');

const renderYaml = readText('render.yaml');
expect(renderYaml.includes('runtime: node'), 'render.yaml uses Node runtime');
expect(
  renderYaml.includes(
    'buildCommand: npm ci && npm run prisma:generate -w @criticool/api && npm run build --workspaces --if-present',
  ),
  'render.yaml build command installs, generates Prisma, and builds workspaces',
);
expect(
  renderYaml.includes('preDeployCommand: npm run prisma:migrate:deploy -w @criticool/api'),
  'render.yaml runs Prisma migrate deploy before start',
);
expect(
  renderYaml.includes('startCommand: npm run start:prod -w @criticool/api'),
  'render.yaml starts the built API workspace',
);
expect(renderYaml.includes('healthCheckPath: /health/ready'), 'render.yaml checks /health/ready');

checkRenderEnv(
  renderYaml,
  'AUTH_PROVIDER',
  (block) => block.includes('value: supabase'),
  'render.yaml sets AUTH_PROVIDER=supabase',
);
checkRenderEnv(
  renderYaml,
  'ACCOUNT_DEV_TOKENS',
  (block) => block.includes('value: "false"'),
  'render.yaml disables ACCOUNT_DEV_TOKENS',
);
for (const key of [
  'DATABASE_URL',
  'DIRECT_URL',
  'SUPABASE_URL',
  'SUPABASE_JWKS_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CORS_ORIGINS',
  'TMDB_ACCESS_TOKEN',
  'TRANSLATION_ENDPOINT_URL',
  'TRANSLATION_API_KEY',
]) {
  checkRenderEnv(
    renderYaml,
    key,
    (block) => block.includes('sync: false'),
    `${key} is dashboard-supplied`,
  );
}

const eas = readJson('eas.json');
expect(eas.cli?.version === '>= 14.0.0', 'eas.json pins EAS CLI >= 14.0.0');
expect(eas.build?.preview?.distribution === 'internal', 'EAS preview build is internal');
expect(eas.build?.preview?.environment === 'preview', 'EAS preview build uses preview env');
expect(eas.build?.preview?.android?.buildType === 'apk', 'EAS preview Android produces APK');
expect(eas.build?.preview?.ios?.simulator === false, 'EAS preview iOS targets devices');

const appJson = readJson('apps/mobile/app.json');
expect(appJson.expo?.scheme === 'criticool', 'Expo app scheme is criticool');
expect(Boolean(appJson.expo?.ios?.bundleIdentifier), 'iOS bundle identifier is set');
expect(Boolean(appJson.expo?.android?.package), 'Android package is set');

const apiEnvExample = readText('apps/api/.env.example');
for (const key of [
  'AUTH_PROVIDER',
  'SUPABASE_URL',
  'SUPABASE_JWKS_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_AUDIENCE',
  'ACCOUNT_DEV_TOKENS',
  'CORS_ORIGINS',
  'TMDB_ACCESS_TOKEN',
  'TRANSLATION_PROVIDER',
]) {
  expect(apiEnvExample.includes(`${key}=`), `apps/api/.env.example documents ${key}`);
}

const mobileEnvExample = readText('apps/mobile/.env.example');
for (const key of [
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
]) {
  expect(mobileEnvExample.includes(`${key}=`), `apps/mobile/.env.example documents ${key}`);
}

const supabaseSource = readText('apps/mobile/src/supabase.ts');
expect(
  supabaseSource.includes("export const supabaseRedirectUrl = 'criticool://auth/callback'"),
  'mobile Supabase confirmation redirect uses criticool://auth/callback',
);
expect(
  supabaseSource.includes(
    "export const supabaseResetRedirectUrl = 'criticool://auth/reset-password'",
  ),
  'mobile Supabase password reset redirect uses criticool://auth/reset-password',
);

const healthSource = readText('apps/api/src/health.controller.ts');
expect(healthSource.includes("@Get('ready')"), 'API exposes /health/ready');
expect(healthSource.includes('SELECT 1'), '/health/ready checks database connectivity');

if (checkEnv) {
  checkHostedEnv();
}

await checkHostedApi(apiUrl);

console.log(`\nPreflight complete: ${failures} failure(s), ${warnings} warning(s).\n`);
process.exit(failures ? 1 : 0);
