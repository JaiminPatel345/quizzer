# Quiz Service Dockerfile - Yarn workspaces, multi-stage build
FROM node:20-alpine AS builder

WORKDIR /workspace

# Root manifests
COPY package.json yarn.lock ./

# Workspace manifests for caching
COPY services/auth-service/package.json services/auth-service/tsconfig.json ./services/auth-service/
COPY services/quiz-service/package.json services/quiz-service/tsconfig.json ./services/quiz-service/
COPY services/ai-service/package.json services/ai-service/tsconfig.json ./services/ai-service/
COPY services/submission-service/package.json services/submission-service/tsconfig.json ./services/submission-service/
COPY services/analytics-service/package.json services/analytics-service/tsconfig.json ./services/analytics-service/

# Install deps via yarn workspaces
RUN corepack enable \
  && corepack prepare yarn@1.22.22 --activate \
  && yarn --version \
  && yarn install --frozen-lockfile

# Copy source and build this workspace only
COPY services/quiz-service/src ./services/quiz-service/src
RUN yarn workspace quiz-service build

# Production stage
FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

WORKDIR /app

COPY services/quiz-service/package.json ./package.json
COPY yarn.lock ./yarn.lock

RUN corepack enable \
  && corepack prepare yarn@1.22.22 --activate \
  && (yarn install --production --frozen-lockfile || yarn install --production) \
  && yarn cache clean

COPY --from=builder /workspace/services/quiz-service/dist ./dist

RUN mkdir -p logs && chown -R nodeuser:nodejs /app

USER nodeuser

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
