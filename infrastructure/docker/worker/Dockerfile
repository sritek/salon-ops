# Worker Dockerfile (BullMQ Workers)
# Based on: .cursor/rules/15-devops-infrastructure.mdc lines 166-200

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy source and prisma
COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && npx prisma generate

# Copy built worker code (built externally)
COPY apps/api/dist ./apps/api/dist

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker
RUN chown -R worker:nodejs /app

USER worker

# No port exposure - workers don't serve HTTP

WORKDIR /app/apps/api

CMD ["node", "dist/workers/index.js"]
