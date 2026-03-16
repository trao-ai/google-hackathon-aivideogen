# ── Base: install all deps for the monorepo ──────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# Copy root package files + all workspace package.jsons for caching
COPY package.json package-lock.json ./
COPY turbo.json tsconfig.base.json ./
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/integrations/package.json packages/integrations/
COPY packages/prompts/package.json packages/prompts/
COPY packages/style-system/package.json packages/style-system/
COPY packages/cost-estimation/package.json packages/cost-estimation/
COPY packages/validation/package.json packages/validation/
COPY packages/motion-fallback/package.json packages/motion-fallback/
COPY apps/api/package.json apps/api/
COPY apps/workers/package.json apps/workers/
COPY apps/web/package.json apps/web/

RUN npm ci

# ── Production deps only (for smaller final images) ─────────────────────────
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/integrations/package.json packages/integrations/
COPY packages/prompts/package.json packages/prompts/
COPY packages/style-system/package.json packages/style-system/
COPY packages/cost-estimation/package.json packages/cost-estimation/
COPY packages/validation/package.json packages/validation/
COPY packages/motion-fallback/package.json packages/motion-fallback/
COPY apps/api/package.json apps/api/
COPY apps/workers/package.json apps/workers/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev

# ── Build: compile everything ────────────────────────────────────────────────
FROM base AS build
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

# Build all packages — use ; for packages so one failure doesn't block api/workers
RUN npx tsc -p packages/shared/tsconfig.json; \
    npx tsc -p packages/db/tsconfig.json; \
    npx tsc -p packages/integrations/tsconfig.json; \
    npx tsc -p packages/prompts/tsconfig.json; \
    npx tsc -p packages/style-system/tsconfig.json; \
    npx tsc -p packages/cost-estimation/tsconfig.json; \
    npx tsc -p packages/validation/tsconfig.json; \
    npx tsc -p packages/motion-fallback/tsconfig.json; \
    npx tsc -p apps/api/tsconfig.json && \
    npx tsc -p apps/workers/tsconfig.json && \
    echo "API and Workers compiled successfully"

# Build Next.js web app
RUN cd apps/web && npm run build

# ── API target ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS api
WORKDIR /app
ENV NODE_ENV=production

# Production-only node_modules (much smaller — no TS, Next.js, React, etc.)
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/packages/db/package.json ./packages/db/
COPY --from=build /app/packages/db/prisma ./packages/db/prisma
COPY --from=build /app/packages/integrations/dist ./packages/integrations/dist
COPY --from=build /app/packages/integrations/package.json ./packages/integrations/
COPY --from=build /app/packages/prompts/dist ./packages/prompts/dist
COPY --from=build /app/packages/prompts/package.json ./packages/prompts/
COPY --from=build /app/packages/style-system/dist ./packages/style-system/dist
COPY --from=build /app/packages/style-system/package.json ./packages/style-system/
COPY --from=build /app/packages/cost-estimation/dist ./packages/cost-estimation/dist
COPY --from=build /app/packages/cost-estimation/package.json ./packages/cost-estimation/
COPY --from=build /app/packages/validation/dist ./packages/validation/dist
COPY --from=build /app/packages/validation/package.json ./packages/validation/
COPY --from=build /app/packages/motion-fallback/dist ./packages/motion-fallback/dist
COPY --from=build /app/packages/motion-fallback/package.json ./packages/motion-fallback/
COPY --from=build /app/apps/api/dist ./apps/api/dist

EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]

# ── Workers target ───────────────────────────────────────────────────────────
FROM node:20-alpine AS workers
WORKDIR /app
ENV NODE_ENV=production

# Workers need ffmpeg with full codec/filter support for video/audio processing
RUN apk add --no-cache ffmpeg libass fontconfig ttf-dejavu

# Production-only node_modules (much smaller)
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/packages/db/package.json ./packages/db/
COPY --from=build /app/packages/db/prisma ./packages/db/prisma
COPY --from=build /app/packages/integrations/dist ./packages/integrations/dist
COPY --from=build /app/packages/integrations/package.json ./packages/integrations/
COPY --from=build /app/packages/prompts/dist ./packages/prompts/dist
COPY --from=build /app/packages/prompts/package.json ./packages/prompts/
COPY --from=build /app/packages/style-system/dist ./packages/style-system/dist
COPY --from=build /app/packages/style-system/package.json ./packages/style-system/
COPY --from=build /app/packages/cost-estimation/dist ./packages/cost-estimation/dist
COPY --from=build /app/packages/cost-estimation/package.json ./packages/cost-estimation/
COPY --from=build /app/packages/validation/dist ./packages/validation/dist
COPY --from=build /app/packages/validation/package.json ./packages/validation/
COPY --from=build /app/packages/motion-fallback/dist ./packages/motion-fallback/dist
COPY --from=build /app/packages/motion-fallback/package.json ./packages/motion-fallback/
COPY --from=build /app/apps/workers/dist ./apps/workers/dist

CMD ["node", "apps/workers/dist/index.js"]

# ── Web target ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS web
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
