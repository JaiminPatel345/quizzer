# AI Service Dockerfile - Optimized Multi-stage build
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files from service context
COPY services/ai-service/package*.json ./
COPY services/ai-service/tsconfig.json ./

# Install all deps for build
RUN npm ci

# Copy source and build
COPY services/ai-service/src/ ./src/
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

# Set working directory
WORKDIR /app

# Only production deps
COPY services/ai-service/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built app
COPY --from=builder /app/dist ./dist

# Copy root .env file if it exists
COPY .env* ./

# Prepare runtime dirs
RUN mkdir -p logs && chown -R nodeuser:nodejs /app

# Switch to non-root user
USER nodeuser

# Correct service port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
