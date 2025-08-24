# Auth Service Dockerfile - Optimized Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY services/auth-service/package*.json ./
COPY services/auth-service/tsconfig.json ./

# Install all deps for build
RUN npm ci

# Copy source and build
COPY services/auth-service/src/ ./src/
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

WORKDIR /app

# Only production deps
COPY services/auth-service/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built app
COPY --from=builder /app/dist ./dist

# Copy root .env file if it exists
COPY .env* ./

# Prepare runtime dirs
RUN mkdir -p logs && chown -R nodeuser:nodejs /app

USER nodeuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
