FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/cms/package.json apps/cms/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --no-audit --no-fund

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build CMS + Web (SSR)
RUN npm run build:cms
RUN npm run build --workspace=web

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Non-root
RUN addgroup --system --gid 1001 app && adduser --system --uid 1001 app

# Runtime deps for Astro SSR (Node adapter does not fully bundle deps)
COPY --from=deps /app/node_modules ./node_modules

# CMS runtime (standalone)
COPY --from=builder /app/apps/cms/.next/standalone ./cms/
COPY --from=builder /app/apps/cms/.next/static ./cms/apps/cms/.next/static

# Web runtime (Astro node standalone)
COPY --from=builder /app/apps/web/dist ./web/dist

# Create writable dirs (mounted in compose in prod)
RUN mkdir -p /data/cms /data/media && chown -R app:app /data

USER app

EXPOSE 3000 4321

# Default: run nothing; compose will override commands per service
CMD ["node", "-e", "console.log('Use docker-compose to run wks-web / wks-cms')"]
