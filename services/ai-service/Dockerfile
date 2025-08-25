# AI Service Dockerfile - Yarn workspaces, multi-stage build
FROM node:20-alpine AS builder

# Use a consistent workdir representing repo root
WORKDIR /workspace

# Enable yarn and copy root manifests
COPY package.json yarn.lock ./

# Copy workspace manifests for better layer caching
COPY services/auth-service/package.json services/auth-service/tsconfig.json ./services/auth-service/
COPY services/quiz-service/package.json services/quiz-service/tsconfig.json ./services/quiz-service/
COPY services/ai-service/package.json services/ai-service/tsconfig.json ./services/ai-service/
COPY services/submission-service/package.json services/submission-service/tsconfig.json ./services/submission-service/
COPY services/analytics-service/package.json services/analytics-service/tsconfig.json ./services/analytics-service/

# Install yarn v1 and dependencies using the root lockfile
RUN corepack enable \
  && corepack prepare yarn@1.22.22 --activate \
  && yarn --version \
  && yarn install --frozen-lockfile

# Copy only this service's source and build it via workspace script
COPY services/ai-service/src ./services/ai-service/src
RUN yarn workspace ai-service build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

# App runtime directory
WORKDIR /app

# Copy runtime manifest and lockfile (use root lock for reproducible installs)
COPY services/ai-service/package.json ./package.json
COPY yarn.lock ./yarn.lock

# Install only production deps; fall back if frozen lock cannot be satisfied
RUN corepack enable \
  && corepack prepare yarn@1.22.22 --activate \
  && (yarn install --production --frozen-lockfile || yarn install --production) \
  && yarn cache clean

# Copy built app from builder
COPY --from=builder /workspace/services/ai-service/dist ./dist

# Prepare runtime dirs
RUN mkdir -p logs && chown -R nodeuser:nodejs /app

# Switch to non-root user
USER nodeuser

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:80/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
